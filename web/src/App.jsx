import React, { useEffect, useState } from "react";
import MainPage from "./pages/MainPage.jsx";
import EventsPage from "./pages/EventsPage";  
import ProfilePage from "./pages/ProfilePage";
import LoadingSpinner from "./components/LoadingSpinner";
import { WebSocketProvider } from "./services/websocket";
import apiService from "./services/api";

/**
 * Главное приложение беттинг платформы
 * Упрощенный роутинг без лишних зависимостей
 */
function App() {
  const [tgUser, setTgUser] = useState(null);
  const [currentView, setCurrentView] = useState('loading');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeTelegramApp();
  }, []);

  const initializeTelegramApp = async () => {
    try {
      console.log('[APP] Starting initialization...');
      console.log('[APP] window.Telegram:', window.Telegram);
      
      // Инициализация Telegram WebApp
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Настройка Telegram WebApp
        tg.ready();
        tg.expand();
        
        // Настройка темы для прозрачности
        if (tg.setBackgroundColor) {
          tg.setBackgroundColor('#1a1d24');
        }
        if (tg.setHeaderColor) {
          tg.setHeaderColor('#1a1d24');
        }
        
        // Включаем прозрачность фона
        if (tg.enableClosingConfirmation) {
          tg.enableClosingConfirmation();
        }
        if (tg.disableVerticalSwipes) {
          tg.disableVerticalSwipes();
        }

        // Получение данных пользователя
        const initDataUnsafe = tg.initDataUnsafe;
        console.log('[APP] initDataUnsafe:', initDataUnsafe);
        
        if (initDataUnsafe && initDataUnsafe.user) {
          const user = initDataUnsafe.user;
          
          console.log('[APP] Telegram user:', user);
          
          // Пропускаем аутентификацию для MVP
          console.log('[APP] Skipping auth for MVP');
          setTgUser(user);
          setCurrentView('home');
        } else {
          // Тестовый режим (без Telegram)
          console.log('[APP] Test mode - no Telegram data');
          setTgUser({ 
            id: 123456789, 
            first_name: 'Test User',
            username: 'testuser'
          });
          setCurrentView('home');
        }
      } else {
        // Веб-версия без Telegram
        console.log('[APP] Web mode - no Telegram WebApp');
        setTgUser({ 
          id: 987654321, 
          first_name: 'Web User',
          username: 'webuser'
        });
        setCurrentView('home');
      }
    } catch (error) {
      console.error('[APP] Initialization error:', error);
      setCurrentView('error');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (view, data = {}) => {
    setCurrentView(view);
    // Можно добавить данные для передачи между страницами
    if (data) {
      console.log('[APP] Navigation data:', data);
    }
  };

  // Компонент навигации
  const Navigation = () => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      borderTop: '1px solid #dee2e6',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px 0',
      zIndex: 1000
    }}>
      {[
        { key: 'home', icon: '🏠', label: 'Главная' },
        { key: 'events', icon: '🎯', label: 'События' },
        { key: 'profile', icon: '👤', label: 'Профиль' }
      ].map(({ key, icon, label }) => (
        <button
          key={key}
          onClick={() => handleNavigation(key)}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: currentView === key ? '#007bff' : '#6c757d',
            fontSize: '12px',
            transition: 'color 0.3s'
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '2px' }}>{icon}</div>
          <div>{label}</div>
        </button>
      ))}
    </div>
  );

  // Состояния загрузки и ошибок
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0e0e0e'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (currentView === 'error') {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        color: '#dc3545'
      }}>
        <h2>❌ Ошибка инициализации</h2>
        <p>Попробуйте перезагрузить приложение</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 Перезагрузить
        </button>
      </div>
    );
  }

  // Основное приложение с WebSocket провайдером
  const API_URL = process.env.REACT_APP_API_URL || 'https://gift-zona-server.onrender.com';
  
  return (
    <WebSocketProvider apiUrl={API_URL}>
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: 'transparent', // Прозрачный фон для интеграции с Telegram
        paddingBottom: '0'
      }}>
        {/* Основной контент */}
        {currentView === 'home' && (
          <MainPage 
            user={tgUser} 
            onNavigate={handleNavigation}
          />
        )}
        
        {currentView === 'events' && (
          <EventsPage 
            userId={tgUser?.id} 
            onNavigate={handleNavigation}
          />
        )}
        
        {currentView === 'profile' && (
          <ProfilePage 
            userId={tgUser?.id}
            user={tgUser}
          />
        )}

        {/* Навигация убрана - встроена в MainPage */}
      </div>
    </WebSocketProvider>
  );
}

export default App;
