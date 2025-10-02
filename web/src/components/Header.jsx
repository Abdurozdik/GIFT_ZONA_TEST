import React, { useState, useEffect } from 'react';
import './Header.css';

// Убираем SVG иконки - используем CSS background-image

const Header = ({ 
  collapsed = false, 
  balance = 1467, 
  cashback = 0, 
  onMenuToggle,
  onProfileClick,
  onBetsClick 
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('gifts');

  // Определяем валюты
  const currencies = [
    { id: 'gifts', name: 'Подарки', icon: <span className="coin-icon"></span> },
    { id: 'ton', name: 'TON', icon: <span className="coin-icon"></span> },
    { id: 'stars', name: 'Stars', icon: <span className="coin-icon"></span> }
  ];

  const currentCurrency = currencies.find(c => c.id === selectedCurrency);

  if (collapsed) {
    // Свернутая шапка при скролле
    return (
      <header className="header-collapsed">
        <div className="header-content">
          {/* Баланс */}
          <div className="balance-section">
            <div className="balance-item">
              <span className="coin-icon"></span>
              <span className="balance-value">{balance}</span>
            </div>
            {cashback > 0 && (
              <div className="cashback-item">
                <span className="diamond-icon">💎</span>
                <span className="cashback-value">{cashback}</span>
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="header-actions">
            <button 
              className="action-btn"
              onClick={onBetsClick}
              title="Мои ставки"
            >
              📊
            </button>
            <button 
              className="action-btn"
              onClick={onProfileClick}
              title="Профиль"
            >
              👤
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Полная шапка
  return (
    <header className="header-full">
      <div className="header-content">
        {/* Левая секция */}
        <div className="header-left">
          {/* Лого ТОЧНО как в DevTools */}
          <a href="/" className="logo">
            <div className="title">
              <b className="hide-on-mobile">GIFT</b>ZONA<br />
              <span>Ставки на киберспорт</span>
            </div>
          </a>

          {/* Звук */}
          <button 
            className={`sound-toggle ${!soundEnabled ? 'muted' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Отключить звук" : "Включить звук"}
          >
            {/* Иконка через CSS background-image */}
          </button>

          {/* Валюта */}
          <div className="currency-selector">
            <div className="currency-display">
              <span className="country-flag"></span>
              <span className="currency-name">{currentCurrency.name}</span>
            </div>
          </div>
        </div>

        {/* Правая секция */}
        <div className="header-right">
          {/* Баланс */}
          <div className="balance-section">
            <div className="balance-item main-balance">
              <span className="coin-icon"></span>
              <span className="balance-value">{balance}</span>
              <span className="balance-label">подарков</span>
            </div>
            {cashback > 0 && (
              <div className="cashback-item">
                <span className="diamond-icon">💎</span>
                <span className="cashback-value">{cashback}</span>
              </div>
            )}
          </div>

          {/* Меню */}
          <button 
            className="menu-toggle"
            onClick={onMenuToggle}
            title="Меню"
          >
            {/* Иконка через CSS background-image */}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
