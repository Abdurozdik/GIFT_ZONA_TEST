import React, { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import apiService from "../services/api";

/**
 * Страница событий для беттинга
 * НОВЫЙ функционал для беттинг платформы
 */
function EventsPage({ userId, onNavigate }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getActiveEvents();
      
      if (response.success) {
        setEvents(response.events);
      } else {
        throw new Error('Не удалось загрузить события');
      }
      
    } catch (error) {
      console.error('Ошибка загрузки событий:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    // Переход к размещению ставки
    onNavigate('betting', { event });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return '#ffc107';
      case 'active': return '#28a745';
      case 'finished': return '#6c757d';
      default: return '#007bff';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting': return '⏳ Ожидание';
      case 'active': return '🔥 Активно';
      case 'finished': return '✅ Завершено';
      default: return status;
    }
  };

  const formatTimeLeft = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Завершено';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}д ${hours % 24}ч`;
    }
    
    return hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        color: '#dc3545'
      }}>
        <h2>❌ Ошибка загрузки</h2>
        <p>{error}</p>
        <button 
          onClick={loadEvents}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 Повторить
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Заголовок */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        borderRadius: '15px',
        color: 'white'
      }}>
        <h1>🎯 События для ставок</h1>
        <p>Выберите событие и сделайте свою ставку!</p>
      </div>

      {/* Статистика */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {events.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Всего событий</div>
        </div>
        
        <div style={{ 
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {events.filter(e => e.status === 'active').length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Активных</div>
        </div>
        
        <div style={{ 
          textAlign: 'center',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
            {events.reduce((sum, e) => sum + e.total_bank, 0)}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Общий банк ⭐</div>
        </div>
      </div>

      {/* Список событий */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {events.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px',
            backgroundColor: '#f8f9fa',
            borderRadius: '15px',
            color: '#6c757d'
          }}>
            <h3>📭 Нет активных событий</h3>
            <p>События появятся здесь, как только будут добавлены администратором</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              onClick={() => handleEventClick(event)}
              style={{
                padding: '20px',
                border: '2px solid #dee2e6',
                borderRadius: '15px',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#dee2e6';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              {/* Заголовок и статус */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>
                    {event.title}
                  </h3>
                  {event.description && (
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      {event.description}
                    </p>
                  )}
                </div>
                
                <div style={{
                  padding: '5px 12px',
                  backgroundColor: getStatusColor(event.status),
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}>
                  {getStatusText(event.status)}
                </div>
              </div>

              {/* Исходы и коэффициенты */}
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: `repeat(${event.outcomes.length}, 1fr)`,
                  gap: '10px'
                }}>
                  {event.outcomes.map((outcome, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '10px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: '1px solid #dee2e6'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '5px' }}>
                        {outcome}
                      </div>
                      <div style={{ 
                        color: '#007bff', 
                        fontSize: '16px', 
                        fontWeight: 'bold' 
                      }}>
                        {event.coefficients[index]}x
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Информация о банке и времени */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#666'
              }}>
                <div>
                  💰 Банк: <strong style={{ color: '#28a745' }}>{event.total_bank} ⭐</strong>
                </div>
                <div>
                  ⏰ {formatTimeLeft(event.end_time)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Кнопка обновления */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          onClick={loadEvents}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔄 Обновить события
        </button>
      </div>
    </div>
  );
}

export default EventsPage;

