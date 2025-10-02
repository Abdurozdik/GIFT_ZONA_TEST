import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header.jsx';
import './MainPage.css';

// Точная копия данных из CSGOPositive
const mockPopularEvents = [
  {
    id: 1,
    team1: { name: 'M80', logo: 'M80' },
    team2: { name: 'ENCE', logo: 'ENCE' },
    tournament: 'ESL Pro League',
    date: '28.09.2025',
    format: 'BO3',
    coefficients: { team1: 7.998, team2: null },
    isLive: true,
    score: { team1: 5, team2: 12 },
    timeLeft: '02:54:13'
  },
  {
    id: 2,
    team1: { name: 'OG', logo: 'OG' },
    team2: { name: 'Passion UA', logo: 'PUA' },
    tournament: 'DraculaN',
    date: '28.09.2025', 
    format: 'BO3',
    coefficients: { team1: 1.853, team2: 1.847 },
    isLive: true,
    score: { team1: 0, team2: 8 },
    timeLeft: '01:30:15'
  },
  {
    id: 3,
    team1: { name: 'BESTIA', logo: 'BST' },
    team2: { name: 'ODDIK', logo: 'ODK' },
    tournament: 'FERJEE Rush',
    date: '28.09.2025',
    format: 'BO3', 
    coefficients: { team1: 1.850, team2: 1.850 },
    isLive: false,
    startTime: '00:33:15'
  }
];

const mockLiveEvents = [
  {
    id: 4,
    team1: { name: 'ex-Inner Circle', logo: 'EIC' },
    team2: { name: '9INE', logo: '9INE' },
    tournament: 'Birch Cup',
    coefficients: { team1: 2.044, team2: 1.678 },
    isLive: true,
    score: { team1: 0, team2: 0 },
    format: 'BO3',
    timeLeft: '03:23:41'
  },
  {
    id: 5,
    team1: { name: 'OG', logo: 'OG' },
    team2: { name: 'Passion UA', logo: 'PUA' },
    tournament: 'DraculaN',
    coefficients: { team1: 1.848, team2: 1.852 },
    isLive: true,
    score: { team1: 5, team2: 5 },
    format: 'BO3',
    timeLeft: '02:27:00',
    hasWatchButton: true
  }
];

const mockUpcomingEvents = [
  {
    id: 6,
    team1: { name: 'Yawara Esports', logo: 'YAW' },
    team2: { name: 'Gaimin Gladiators', logo: 'GG' },
    tournament: 'FERJEE Rush',
    coefficients: { team1: 2.683, team2: 1.386 },
    isLive: false,
    startTime: '00:33:15',
    format: 'BO3'
  },
  {
    id: 7,
    team1: { name: 'BESTIA', logo: 'BST' },
    team2: { name: 'ODDIK', logo: 'ODK' },
    tournament: 'FERJEE Rush',
    coefficients: { team1: 1.850, team2: 1.850 },
    isLive: false,
    startTime: '00:33:15',
    format: 'BO3'
  }
];

const mockCompletedEvents = [
  {
    id: 8,
    team1: { name: 'ex-Inner Circle', logo: '⚫' },
    team2: { name: '9INE', logo: '🎯' },
    tournament: 'Birch Cup',
    result: { team1: 1, team2: 2 },
    winner: 'team2',
    date: '28 СЕНТЯБРЯ 18:55'
  },
  {
    id: 9,
    team1: { name: 'Heroic', logo: '🦸' },
    team2: { name: 'Gentle Mates', logo: '🤝' },
    tournament: 'ESL Pro League',
    result: { team1: 1, team2: 2 },
    winner: 'team2',
    date: '28 СЕНТЯБРЯ 18:57'
  }
];

const MainPage = () => {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPopularIndex, setCurrentPopularIndex] = useState(0);
  const [onlineCount] = useState(Math.floor(Math.random() * 1000) + 500);
  const scrollRef = useRef(null);

  // Обработка скролла для сворачивания шапки
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const scrollTop = scrollRef.current.scrollTop;
        setIsHeaderCollapsed(scrollTop > 100);
      }
    };

    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Автоматическое переключение популярных событий
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPopularIndex((prev) => 
        (prev + 1) % mockPopularEvents.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timeString) => {
    if (timeString.includes(':')) {
      return timeString; // Уже отформатировано
    }
    const date = new Date(timeString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const EventCard = ({ event, type = 'upcoming' }) => (
    <div className={`event-card ${type}`}>
      <div className="event-header">
        <div className="tournament-info">
          <span className="tournament-flag">🏆</span>
          <span className="tournament-name">{event.tournament}</span>
          {event.date && <span className="event-date">{event.date}</span>}
          {event.format && <span className="event-format">{event.format}</span>}
        </div>
        {event.isLive && (
          <div className="live-indicator">
            <span className="live-dot pulse-live"></span>
            <span className="live-text">LIVE</span>
          </div>
        )}
        {event.hasWatchButton && (
          <button className="watch-button">
            ▶ ПРОСМОТР
          </button>
        )}
      </div>

      <div className="teams-section">
        <div className="team">
          <div className="team-logo-text">{event.team1.logo}</div>
          <span className="team-name">{event.team1.name}</span>
          {event.score && <span className="team-score">{event.score.team1}</span>}
        </div>

        <div className="match-center">
          {event.isLive ? (
            <div className="live-info">
              {event.score && (
                <div className="live-score">
                  {event.score.team1} : {event.score.team2}
                </div>
              )}
              <span className="time-left">{event.timeLeft}</span>
            </div>
          ) : event.result ? (
            <div className="match-result">
              <span className="result-score">
                {event.result.team1} : {event.result.team2}
              </span>
              <span className="match-date">{event.date}</span>
            </div>
          ) : (
            <div className="upcoming-info">
              <span className="start-time">{event.startTime}</span>
            </div>
          )}
        </div>

        <div className="team">
          <div className="team-logo-text">{event.team2.logo}</div>
          <span className="team-name">{event.team2.name}</span>
          {event.score && <span className="team-score">{event.score.team2}</span>}
        </div>
      </div>

      {(event.coefficients || event.result) && (
        <div className="betting-section">
          {event.coefficients ? (
            <>
              <button 
                className={`coefficient ${event.coefficients.team1 ? '' : 'disabled'}`}
                disabled={!event.coefficients.team1}
              >
                {event.coefficients.team1 ? `×${event.coefficients.team1}` : 'БЛОК'}
              </button>
              <button 
                className={`coefficient ${event.coefficients.team2 ? '' : 'disabled'}`}
                disabled={!event.coefficients.team2}
              >
                {event.coefficients.team2 ? `×${event.coefficients.team2}` : 'БЛОК'}
              </button>
            </>
          ) : event.result && (
            <div className="match-status">
              <span className={`winner-indicator ${event.winner}`}>
                {event.winner === 'team1' ? event.team1.name : event.team2.name} ПОБЕДИЛ
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="main-page">
      <Header 
        collapsed={isHeaderCollapsed}
        balance={1467}
        cashback={0}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        onProfileClick={() => console.log('Профиль')}
        onBetsClick={() => console.log('Мои ставки')}
      />

      <div className="main-content" ref={scrollRef}>
        {/* Популярные события */}
        <section className="popular-events-section">
          <div className="section-header">
            <h2 className="section-title">Популярные события</h2>
            <div className="popular-indicators">
              {mockPopularEvents.map((_, index) => (
                <div 
                  key={index}
                  className={`indicator ${index === currentPopularIndex ? 'active' : ''}`}
                  onClick={() => setCurrentPopularIndex(index)}
                />
              ))}
            </div>
          </div>
          
          <div className="popular-carousel">
            <EventCard 
              event={mockPopularEvents[currentPopularIndex]} 
              type="popular"
            />
          </div>
        </section>

        {/* Текущие события */}
        <section className="current-events-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="live-dot pulse-live"></span>
              ТЕКУЩИЕ
            </h2>
          </div>
          
          <div className="events-grid">
            {mockLiveEvents.map(event => (
              <EventCard key={event.id} event={event} type="live" />
            ))}
          </div>
        </section>

        {/* Предстоящие события */}
        <section className="upcoming-events-section">
          <div className="section-header">
            <h2 className="section-title">
              ⚡ ПРЕДСТОЯЩИЕ МАТЧИ
            </h2>
          </div>
          
          <div className="events-grid">
            {mockUpcomingEvents.map(event => (
              <EventCard key={event.id} event={event} type="upcoming" />
            ))}
          </div>
        </section>

        {/* Завершенные матчи */}
        <section className="completed-events-section">
          <div className="section-header">
            <h2 className="section-title">ЗАВЕРШЕННЫЕ МАТЧИ</h2>
          </div>
          
          <div className="events-grid">
            {mockCompletedEvents.map(event => (
              <EventCard key={event.id} event={event} type="completed" />
            ))}
          </div>
        </section>

        {/* Футер с онлайном и чатом */}
        <div className="bottom-panel">
          <div className="online-counter">
            <span className="online-dot"></span>
            <span className="online-text">ЧАТ</span>
            <span className="online-count">{onlineCount} ONLINE</span>
          </div>
          
          <div className="game-filter">
            <span className="filter-label">ФИЛЬТР ПО ИГРАМ</span>
            <div className="filter-buttons">
              <button className="filter-btn active">CS</button>
              <button className="filter-btn">DOTA</button>
              <button className="filter-btn">MMA</button>
              <button className="filter-btn">⚽</button>
            </div>
          </div>
        </div>
      </div>

      {/* Меню оверлей */}
      {isMenuOpen && (
        <div className="menu-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">
              <h3>МЕНЮ</h3>
              <button 
                className="menu-close"
                onClick={() => setIsMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="menu-items">
              <button className="menu-item">📊 МОИ СТАВКИ</button>
              <button className="menu-item">📰 НОВОСТИ</button>
              <button className="menu-item">🛠️ ТЕХПОДДЕРЖКА</button>
              <button className="menu-item">📈 СТАТИСТИКА КОМАНД</button>
              <button className="menu-item">👤 ПРОФИЛЬ</button>
              <button className="menu-item">🛒 МАРКЕТ</button>
              <button className="menu-item">🤝 ПАРТНЕРСКАЯ ПРОГРАММА</button>
              <button className="menu-item">📄 СОГЛАШЕНИЕ</button>
              <button className="menu-item">🔒 ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ</button>
              <button className="menu-item">📞 КОНТАКТЫ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
