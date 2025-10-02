import React, { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import apiService from "../services/api";

/**
 * Страница профиля пользователя
 * Адаптировано из MyGifts.js - управление подарками, баланс, депозиты/выводы
 */
function ProfilePage({ userId }) {
  const [gifts, setGifts] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGifts, setSelectedGifts] = useState({});
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState(null);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Загружаем подарки и баланс параллельно
      const [giftsData, balanceData] = await Promise.all([
        apiService.getUserDeposits(userId),
        apiService.getUserBalance(userId)
      ]);
      
      setGifts(giftsData);
      setBalance(balanceData.balance);
      
    } catch (error) {
      console.error('Ошибка загрузки данных профиля:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGiftToggle = (giftId) => {
    setSelectedGifts(prev => ({
      ...prev,
      [giftId]: !prev[giftId]
    }));
  };

  const handleWithdraw = async () => {
    const selectedGiftIds = Object.keys(selectedGifts).filter(id => selectedGifts[id]);
    
    if (selectedGiftIds.length === 0) {
      alert('Выберите подарки для вывода');
      return;
    }

    const totalStars = selectedGiftIds.length * 25;
    const giftWord = selectedGiftIds.length === 1 ? 'подарок' : 
                    selectedGiftIds.length <= 4 ? 'подарка' : 'подарков';

    if (!window.confirm(`Вывести ${selectedGiftIds.length} ${giftWord} за ${totalStars} звезд?`)) {
      return;
    }

    setWithdrawing(true);
    setWithdrawalStatus(`Создание счета для оплаты ${totalStars} звезд...`);

    try {
      // Создаем invoice для оплаты
      const invoiceData = await apiService.createPaymentInvoice(
        selectedGiftIds.map(id => parseInt(id)), 
        parseInt(userId)
      );

      if (invoiceData.success && invoiceData.invoice_url) {
        setWithdrawalStatus('Открываем окно оплаты...');
        
        // Открываем Telegram invoice
        if (window.Telegram?.WebApp?.openInvoice) {
          window.Telegram.WebApp.openInvoice(invoiceData.invoice_url, (status) => {
            if (status === 'paid') {
              setWithdrawalStatus('Оплата прошла успешно! Обрабатываем вывод...');
              // Перезагружаем данные через несколько секунд
              setTimeout(() => {
                loadUserData();
                setSelectedGifts({});
                setWithdrawalStatus(null);
                setWithdrawing(false);
              }, 3000);
            } else {
              setWithdrawalStatus('Оплата отменена');
              setWithdrawing(false);
            }
          });
        } else {
          // Fallback - открываем в браузере
          window.open(invoiceData.invoice_url, '_blank');
          setWithdrawalStatus('Завершите оплату в открывшемся окне');
          setWithdrawing(false);
        }
      } else {
        throw new Error(invoiceData.error || 'Не удалось создать счет для оплаты');
      }

    } catch (error) {
      console.error('Ошибка вывода:', error);
      setWithdrawalStatus(`Ошибка: ${error.message}`);
      setWithdrawing(false);
    }
  };

  const selectedCount = Object.values(selectedGifts).filter(Boolean).length;
  const isWithdrawButtonActive = selectedCount > 0 && !withdrawing;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Заголовок профиля */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        color: 'white'
      }}>
        <h1>👤 Мой профиль</h1>
        {balance && (
          <div style={{ marginTop: '15px', fontSize: '18px' }}>
            <div>💰 Доступный баланс: <strong>{balance.available_balance} ⭐</strong></div>
            <div style={{ fontSize: '14px', opacity: '0.9', marginTop: '5px' }}>
              Депозитов: {balance.total_deposited} ⭐ | 
              Потрачено: {balance.total_spent} ⭐ | 
              Выиграно: {balance.total_won} ⭐
            </div>
          </div>
        )}
      </div>

      {/* Управление подарками */}
      <div style={{ marginBottom: '20px' }}>
        <h2>🎁 Мои подарки ({gifts.length})</h2>
        
        {/* Кнопка вывода */}
        {gifts.length > 0 && (
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button
              onClick={handleWithdraw}
              disabled={!isWithdrawButtonActive}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: isWithdrawButtonActive ? '#28a745' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isWithdrawButtonActive ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s'
              }}
            >
              {withdrawing ? '⏳ Обработка...' : `💸 Вывести (${selectedCount})`}
            </button>
            
            {withdrawalStatus && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '5px',
                color: '#495057'
              }}>
                {withdrawalStatus}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Список подарков */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {gifts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            color: '#6c757d'
          }}>
            <h3>📭 У вас пока нет подарков</h3>
            <p>Отправьте подарки боту для пополнения баланса</p>
          </div>
        ) : (
          gifts.map((gift) => (
            <div
              key={gift.id}
              style={{
                padding: '15px',
                border: '2px solid',
                borderColor: selectedGifts[gift.id] ? '#007bff' : '#dee2e6',
                borderRadius: '10px',
                backgroundColor: selectedGifts[gift.id] ? '#e3f2fd' : 'white',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onClick={() => handleGiftToggle(gift.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                    🎁 {gift.title}
                  </h4>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Стоимость: <strong>{gift.num} ⭐</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(gift.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '2px solid #007bff',
                  backgroundColor: selectedGifts[gift.id] ? '#007bff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px'
                }}>
                  {selectedGifts[gift.id] ? '✓' : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Реферальная ссылка */}
      <div style={{ 
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <h3>🔗 Реферальная ссылка</h3>
        <div style={{ 
          padding: '10px',
          backgroundColor: 'white',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '14px',
          wordBreak: 'break-all',
          color: '#007bff'
        }}>
          https://t.me/gift_zona_bot?start={userId}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`https://t.me/gift_zona_bot?start=${userId}`);
            alert('Ссылка скопирована!');
          }}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📋 Скопировать
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;

