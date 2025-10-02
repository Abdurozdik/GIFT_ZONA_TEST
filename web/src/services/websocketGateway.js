import React from 'react';

/**
 * Unified WebSocket Gateway - Клиент для подключения к единому /ws endpoint
 * Архитектура как в настоящих казино (Thunderpick, Stake) 
 */

class UnifiedWebSocketClient {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.ws = null;
    this.subscriptions = new Set();
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnecting = false;
    this.userInfo = null;
    
    // Heartbeat
    this.pingInterval = null;
    this.pongTimeout = null;
    
    console.log('[WEBSOCKET_GATEWAY] 🚀 Unified WebSocket client initialized');
    
    // Обработчик Page Visibility API для переподключения при возврате на страницу
    this.setupVisibilityHandler();
  }
  
  setupVisibilityHandler() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          console.log('[WEBSOCKET_GATEWAY] 👁️ Page became visible, checking connection...');
          
          // Если WebSocket отключен, переподключаемся
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
            console.log('[WEBSOCKET_GATEWAY] 🔄 Reconnecting after page visibility...');
            setTimeout(() => {
              this.connect(this.userInfo);
            }, 100);
          }
        } else {
          console.log('[WEBSOCKET_GATEWAY] 👁️ Page hidden');
        }
      });
    }
  }
  
  connect(userInfo = null) {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      console.log('[WEBSOCKET_GATEWAY] Already connected or connecting');
      return;
    }
    
    this.userInfo = userInfo;
    this.isConnecting = true;
    
    const wsUrl = this.apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    console.log('[WEBSOCKET_GATEWAY] 🔗 Connecting to:', `${wsUrl}/ws`);
    
    this.ws = new WebSocket(`${wsUrl}/ws`);
    
    this.ws.onopen = () => {
      console.log('[WEBSOCKET_GATEWAY] ✅ Connected to unified gateway');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Запускаем heartbeat
      this.startHeartbeat();
      
      // Переподписываемся на все каналы
      this.resubscribeAll();
      
      // Уведомляем слушателей
      this.emit('connection', { status: 'connected' });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[WEBSOCKET_GATEWAY] 📨 Message:', message);
        
        this.handleMessage(message);
      } catch (error) {
        console.error('[WEBSOCKET_GATEWAY] ❌ Error parsing message:', error);
      }
    };
    
    this.ws.onclose = () => {
      console.log('[WEBSOCKET_GATEWAY] ❌ Connection closed');
      this.isConnecting = false;
      this.stopHeartbeat();
      
      // Уведомляем слушателей
      this.emit('connection', { status: 'disconnected' });
      
      // Автоматический реконнект с экспоненциальной задержкой
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`[WEBSOCKET_GATEWAY] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect(this.userInfo);
        }, delay);
      } else {
        console.log('[WEBSOCKET_GATEWAY] 💀 Max reconnect attempts reached');
        this.emit('connection', { status: 'failed' });
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('[WEBSOCKET_GATEWAY] ❌ WebSocket error:', error);
      this.emit('connection', { status: 'error', error });
    };
  }
  
  handleMessage(message) {
    const { type, channel, data } = message;
    
    switch (type) {
      case 'pong':
        // Heartbeat ответ
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
          this.pongTimeout = null;
        }
        break;
        
      case 'initial_state':
        // Состояние при подключении
        console.log('[WEBSOCKET_GATEWAY] 📊 Initial state received');
        if (data) {
          Object.entries(data).forEach(([gameType, gameData]) => {
            this.emit(`${gameType}_state`, gameData);
          });
        }
        break;
        
      case 'game_state':
        // Обновление состояния игры
        if (channel && data) {
          this.emit(`${channel}_state`, data);
        }
        break;
        
      case 'animation_start':
        // Команда запуска анимации
        if (channel && data) {
          this.emit(`${channel}_animation`, data);
        }
        break;
        
      case 'winner_modal':
        // Команда показа winner modal
        if (channel && data) {
          this.emit(`${channel}_winner`, data);
        }
        break;
        
      case 'double_stats':
        // Статистика Double игры
        this.emit('double_stats', data);
        break;
        
      default:
        console.log(`[WEBSOCKET_GATEWAY] 🤷 Unknown message type: ${type}`);
    }
  }
  
  subscribe(channel) {
    if (!channel) return;
    
    this.subscriptions.add(channel);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[WEBSOCKET_GATEWAY] 📡 Subscribing to: ${channel}`);
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: channel
      }));
    }
  }
  
  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`[WEBSOCKET_GATEWAY] 📡 Unsubscribing from: ${channel}`);
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        channel: channel
      }));
    }
  }
  
  resubscribeAll() {
    // Переподписываемся на все каналы при переподключении
    this.subscriptions.forEach(channel => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log(`[WEBSOCKET_GATEWAY] 🔄 Resubscribing to: ${channel}`);
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          channel: channel
        }));
      }
    });
  }
  
  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        
        // Ожидаем pong в течение 5 секунд
        this.pongTimeout = setTimeout(() => {
          console.log('[WEBSOCKET_GATEWAY] 💀 Heartbeat timeout - reconnecting');
          this.ws.close();
        }, 5000);
      }
    }, 30000); // Ping каждые 30 секунд
  }
  
  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }
  
  // Event system
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
  
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[WEBSOCKET_GATEWAY] ❌ Error in event listener for ${event}:`, error);
      }
    });
  }
  
  disconnect() {
    console.log('[WEBSOCKET_GATEWAY] 🔌 Manually disconnecting');
    this.reconnectAttempts = this.maxReconnectAttempts; // Предотвращаем автореконнект
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
  }
  
  getConnectionStatus() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'disconnecting';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Глобальный экземпляр для всего приложения
let globalWebSocketGateway = null;

export function getWebSocketGateway(apiUrl) {
  if (!globalWebSocketGateway) {
    globalWebSocketGateway = new UnifiedWebSocketClient(apiUrl);
  }
  return globalWebSocketGateway;
}

// React Hook для удобного использования
export function useWebSocketGateway(apiUrl, channels = []) {
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [gameStates, setGameStates] = React.useState({});
  const gateway = React.useRef(null);
  const handlersRef = React.useRef({});
  
  React.useEffect(() => {
    gateway.current = getWebSocketGateway(apiUrl);
    
    // Слушатель статуса подключения
    const handleConnection = (data) => {
      setConnectionStatus(data.status);
    };
    
    // Слушатели состояний игр - создаем один раз и сохраняем
    const gameStateHandlers = {};
    channels.forEach(channel => {
      gameStateHandlers[channel] = (data) => {
        console.log(`[WEBSOCKET_GATEWAY] 📨 Received ${channel} state:`, data);
        setGameStates(prev => ({
          ...prev,
          [channel]: data
        }));
      };
    });
    
    // Сохраняем handlers для cleanup
    handlersRef.current = {
      connection: handleConnection,
      ...gameStateHandlers
    };
    
    gateway.current.on('connection', handleConnection);
    
    // Подписываемся на каналы (Set в subscribe() предотвращает дубликаты)
    channels.forEach(channel => {
      console.log(`[WEBSOCKET_GATEWAY] 📺 Setting up channel: ${channel}`);
      gateway.current.subscribe(channel);
      gateway.current.on(`${channel}_state`, gameStateHandlers[channel]);
    });
    
    // Подключаемся только если не подключены
    const currentStatus = gateway.current.getConnectionStatus();
    console.log('[WEBSOCKET_GATEWAY] 🔌 Current connection status:', currentStatus);
    
    if (currentStatus !== 'connected' && currentStatus !== 'connecting') {
      console.log('[WEBSOCKET_GATEWAY] 🚀 Initiating connection...');
      gateway.current.connect();
    } else {
      console.log('[WEBSOCKET_GATEWAY] ✅ Already connected/connecting, skipping connect()');
      // Эмитируем текущий статус для компонента
      setConnectionStatus(currentStatus);
    }
    
    return () => {
      // Отписываемся от каналов и событий при размонтировании компонента
      if (gateway.current && handlersRef.current) {
        console.log('[WEBSOCKET_GATEWAY] 🧹 Component cleanup, unsubscribing from channels:', channels);
        
        // ВАЖНО: Отписываемся от каналов на сервере
        channels.forEach(channel => {
          console.log(`[WEBSOCKET_GATEWAY] 📡 Unsubscribing from channel: ${channel}`);
          gateway.current.unsubscribe(channel);
          
          // Убираем event listeners
          if (handlersRef.current[channel]) {
            gateway.current.off(`${channel}_state`, handlersRef.current[channel]);
          }
        });
        
        // Убираем connection handler
        gateway.current.off('connection', handlersRef.current.connection);
        
        console.log('[WEBSOCKET_GATEWAY] ✅ Cleanup completed, WebSocket connection preserved');
      }
    };
  }, [apiUrl, channels.join(',')]);
  
  return {
    gateway: gateway.current,
    connectionStatus,
    gameStates,
    subscribe: (channel) => gateway.current?.subscribe(channel),
    unsubscribe: (channel) => gateway.current?.unsubscribe(channel)
  };
}

export default UnifiedWebSocketClient; 