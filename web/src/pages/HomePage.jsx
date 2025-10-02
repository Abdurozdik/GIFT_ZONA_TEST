import React, { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import apiService from "../services/api";

/**
 * Главная страница беттинг платформы
 * Адаптировано из IntroPage.js
 */
function HomePage({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadHomeData();
    }
  }, [user]);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Загружаем баланс пользователя и статистику
      const [balanceData, serverStatus] = await Promise.all([
        apiService.getUserBalance(user.id).catch(() => null),
        apiService.getServerStatus().catch(() => null)
      ]);
      
      if (balanceData?.success) {
        setBalance(balanceData.balance);
      }
      
      if (serverStatus) {
        setStats({
          serverRunning: true,
          telegramConnected: serverStatus.telegram_connected
        });
      }
      
    } catch (error) {
      console.error('Ошибка загрузки данных главной:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'events':
        onNavigate('events');
        break;
      case 'profile':
        onNavigate('profile');
        break;
      case 'deposit':
        // Показываем инструкцию по депозиту
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert(
            '💎 Для пополнения баланса отправьте подарки боту @gift_zona_bot'
          );
        } else {
          alert('💎 Для пополнения баланса отправьте подарки боту @gift_zona_bot');
        }
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Приветствие */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        padding: '25px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>
          🎯 GIFT ZONA
        </h1>
        <p style={{ margin: '0 0 15px 0', fontSize: '16px', opacity: '0.9' }}>
          Добро пожаловать, {user?.first_name || 'Игрок'}!
        </p>
        
        {balance && (
          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '15px',
            borderRadius: '12px',
            marginTop: '15px'
          }}>
            <div style={{ fontSize: '14px', opacity: '0.9', marginBottom: '5px' }}>
              Ваш баланс:
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {balance.available_balance} ⭐
            </div>
          </div>
        )}
      </div>

      {/* Как играть */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '15px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', textAlign: 'center' }}>
          🎮 Как играть?
        </h2>
        
        <div style={{ display: 'grid', gap: '15px' }}>
          {[
            {
              icon: '💎',
              title: 'Пополните баланс',
              description: 'Отправьте подарки боту для пополнения баланса в звездах'
            },
            {
              icon: '🎯',
              title: 'Выберите событие',
              description: 'Просмотрите активные события и выберите подходящее'
            },
            {
              icon: '💰',
              title: 'Сделайте ставку',
              description: 'Выберите исход и укажите размер ставки'
            },
            {
              icon: '🏆',
              title: 'Получите выигрыш',
              description: 'Если ваш прогноз верный - получите выигрыш!'
            }
          ].map((step, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '10px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ 
                fontSize: '24px', 
                marginRight: '15px',
                width: '40px',
                textAlign: 'center'
              }}>
                {step.icon}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Быстрые действия */}
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '15px',
        padding: '25px',
        marginBottom: '25px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#333', textAlign: 'center' }}>
          ⚡ Быстрые действия
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px'
        }}>
          {[
            {
              key: 'events',
              icon: '🎯',
              title: 'События',
              subtitle: 'Сделать ставку',
              color: '#28a745'
            },
            {
              key: 'profile',
              icon: '👤',
              title: 'Профиль',
              subtitle: 'Мои подарки',
              color: '#007bff'
            },
            {
              key: 'deposit',
              icon: '💎',
              title: 'Пополнить',
              subtitle: 'Отправить подарок',
              color: '#ffc107'
            }
          ].map((action) => (
            <button
              key={action.key}
              onClick={() => handleQuickAction(action.key)}
              style={{
                padding: '20px 15px',
                backgroundColor: action.color,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                {action.icon}
              </div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {action.title}
              </div>
              <div style={{ fontSize: '12px', opacity: '0.9' }}>
                {action.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Статус сервера */}
      {stats && (
        <div style={{ 
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          padding: '15px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#666'
        }}>
          <div style={{ marginBottom: '5px' }}>
            Статус: <span style={{ color: stats.serverRunning ? '#28a745' : '#dc3545' }}>
              {stats.serverRunning ? '🟢 Онлайн' : '🔴 Офлайн'}
            </span>
          </div>
          <div>
            Telegram: <span style={{ color: stats.telegramConnected ? '#28a745' : '#ffc107' }}>
              {stats.telegramConnected ? '🟢 Подключен' : '🟡 Не подключен'}
            </span>
          </div>
        </div>
      )}

      {/* Информация */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '30px',
        fontSize: '14px',
        color: '#666'
      }}>
        <p>Следите за новостями: <strong>@gift_zona_news</strong></p>
        <p>Чат игроков: <strong>@gift_zona_chat</strong></p>
      </div>
    </div>
  );
}

export default HomePage;

