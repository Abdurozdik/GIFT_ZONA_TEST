/**
 * API сервис для беттинг платформы
 * Централизованные API вызовы
 */

// Определяем URL API в зависимости от окружения
const API_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL || 'https://gift-zona-server.onrender.com'
  : 'http://localhost:4000';

class ApiService {
  constructor() {
    this.baseURL = API_URL;
  }

  // Базовый метод для API вызовов
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'API Error');
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // === АУТЕНТИФИКАЦИЯ ===
  
  async authenticateTelegram(initData) {
    return this.request('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    });
  }

  // === ПОДАРКИ И ДЕПОЗИТЫ ===
  
  async getUserDeposits(userId) {
    return this.request(`/api/deposits/${userId}`);
  }

  async getUserBalance(userId) {
    return this.request(`/api/deposits/${userId}/balance`);
  }

  async getWithdrawableDeposits(userId) {
    return this.request(`/api/deposits/withdrawable/${userId}`);
  }

  async processWithdrawal(depositId, recipientUserId, ownerUserId) {
    return this.request('/api/deposits/withdrawal/process', {
      method: 'POST',
      body: JSON.stringify({
        depositId,
        recipientUserId,
        ownerUserId,
      }),
    });
  }

  async getWithdrawalHistory(userId) {
    return this.request(`/api/deposits/withdrawal/history/${userId}`);
  }

  async createPaymentInvoice(giftIds, userId) {
    return this.request('/api/deposits/payment/create-invoice', {
      method: 'POST',
      body: JSON.stringify({
        giftIds,
        userId,
      }),
    });
  }

  // === БЕТТИНГ ===
  
  async getActiveEvents() {
    return this.request('/api/betting/events');
  }

  async getEventDetails(eventId) {
    return this.request(`/api/betting/events/${eventId}`);
  }

  async placeBet(userId, eventId, outcome, outcomeIndex, giftIds) {
    return this.request('/api/betting/bet', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        eventId,
        outcome,
        outcomeIndex,
        giftIds,
      }),
    });
  }

  async getUserBets(userId, limit = 20) {
    return this.request(`/api/betting/bets/${userId}?limit=${limit}`);
  }

  async getUserBettingStats(userId) {
    return this.request(`/api/betting/stats/${userId}`);
  }

  async getBettingLeaderboard(limit = 10) {
    return this.request(`/api/betting/leaderboard?limit=${limit}`);
  }

  // === СИСТЕМА ===
  
  async getServerStatus() {
    return this.request('/');
  }

  async getHealthCheck() {
    return this.request('/health');
  }
}

// Экспортируем singleton
export default new ApiService();

