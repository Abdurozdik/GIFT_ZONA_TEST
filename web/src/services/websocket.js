import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import UnifiedWebSocketClient from './websocketGateway';

// Создаем контекст для глобального WebSocket
const WebSocketContext = createContext(null);

// Provider компонент для WebSocket
export const WebSocketProvider = ({ children, apiUrl }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [gameStates, setGameStates] = useState({});
  const [activeChannels, setActiveChannels] = useState(new Set());
  const gatewayRef = useRef(null);
  const handlersRef = useRef({});

  // Инициализация WebSocket при создании провайдера
  useEffect(() => {
    console.log('[WEBSOCKET_CONTEXT] 🚀 Initializing global WebSocket connection...');
    
    // Создаем глобальный gateway
    gatewayRef.current = new UnifiedWebSocketClient(apiUrl);
    
    // Подписываемся на статус подключения
    const handleConnection = (data) => {
      console.log('[WEBSOCKET_CONTEXT] 🔌 Connection status:', data.status);
      setConnectionStatus(data.status);
    };
    
    gatewayRef.current.on('connection', handleConnection);
    handlersRef.current.connection = handleConnection;
    
    // Подключаемся сразу к системным каналам
    gatewayRef.current.connect();
    
    return () => {
      console.log('[WEBSOCKET_CONTEXT] 🧹 Cleaning up global WebSocket...');
      if (gatewayRef.current) {
        // Отписываемся от всех событий
        Object.entries(handlersRef.current).forEach(([event, handler]) => {
          gatewayRef.current.off(event, handler);
        });
        
        // Закрываем соединение
        gatewayRef.current.close();
      }
    };
  }, [apiUrl]);

  // Функция подписки на канал
  const subscribe = useCallback((channel) => {
    if (!gatewayRef.current || !channel) return;
    
    console.log(`[WEBSOCKET_CONTEXT] 📺 Subscribing to channel: ${channel}`);
    
    // Добавляем канал в активные
    setActiveChannels(prev => new Set([...prev, channel]));
    
    // Подписываемся на сервере
    gatewayRef.current.subscribe(channel);
    
    // Создаем обработчик состояния для этого канала
    const stateHandler = (data) => {
      console.log(`[WEBSOCKET_CONTEXT] 📨 Received ${channel} state:`, data);
      setGameStates(prev => ({
        ...prev,
        [channel]: data
      }));
    };
    
    // Подписываемся на события состояния
    gatewayRef.current.on(`${channel}_state`, stateHandler);
    handlersRef.current[`${channel}_state`] = stateHandler;
    
    // Возвращаем функцию отписки
    return () => unsubscribe(channel);
  }, []); // ✅ ПУСТЫЕ ЗАВИСИМОСТИ!

  // Функция отписки от канала
  const unsubscribe = useCallback((channel) => {
    if (!gatewayRef.current || !channel) return;
    
    console.log(`[WEBSOCKET_CONTEXT] 📺 Unsubscribing from channel: ${channel}`);
    
    // Убираем канал из активных
    setActiveChannels(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel);
      return newSet;
    });
    
    // Отписываемся на сервере
    gatewayRef.current.unsubscribe(channel);
    
    // Убираем обработчик состояния
    const stateHandler = handlersRef.current[`${channel}_state`];
    if (stateHandler) {
      gatewayRef.current.off(`${channel}_state`, stateHandler);
      delete handlersRef.current[`${channel}_state`];
    }
    
    // Очищаем состояние канала
    setGameStates(prev => {
      const newStates = { ...prev };
      delete newStates[channel];
      return newStates;
    });
  }, []); // ✅ ПУСТЫЕ ЗАВИСИМОСТИ!

  // Функция подписки на произвольные события
  const on = useCallback((event, handler) => {
    if (!gatewayRef.current) return;
    gatewayRef.current.on(event, handler);
    
    // Возвращаем функцию отписки
    return () => {
      if (gatewayRef.current) {
        gatewayRef.current.off(event, handler);
      }
    };
  }, []); // ✅ ПУСТЫЕ ЗАВИСИМОСТИ!

  // Функция отписки от события
  const off = useCallback((event, handler) => {
    if (!gatewayRef.current) return;
    gatewayRef.current.off(event, handler);
  }, []); // ✅ ПУСТЫЕ ЗАВИСИМОСТИ!

  // Функция получения статуса подключения
  const getConnectionStatus = () => {
    return gatewayRef.current ? gatewayRef.current.getConnectionStatus() : 'disconnected';
  };

  const contextValue = {
    // Состояния
    connectionStatus,
    gameStates,
    activeChannels: Array.from(activeChannels),
    
    // Функции управления каналами
    subscribe,
    unsubscribe,
    
    // Функции управления событиями
    on,
    off,
    
    // Утилиты
    getConnectionStatus,
    gateway: gatewayRef.current
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Хук для использования WebSocket контекста
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
};

// Хук для подписки на конкретный канал
export const useGameChannel = (channel) => {
  const { subscribe, unsubscribe, gameStates, connectionStatus } = useWebSocket();
  
  useEffect(() => {
    if (!channel) return;
    
    console.log(`[USE_GAME_CHANNEL] 📺 Setting up channel: ${channel}`);
    const unsubscribeFn = subscribe(channel);
    
    return () => {
      console.log(`[USE_GAME_CHANNEL] 🧹 Cleaning up channel: ${channel}`);
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [channel]); // ✅ ТОЛЬКО CHANNEL В ЗАВИСИМОСТЯХ!
  
  return {
    gameState: gameStates[channel] || null,
    connectionStatus,
    isConnected: connectionStatus === 'connected'
  };
};

export default WebSocketContext; 