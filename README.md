# 🎯 GIFT ZONA - Betting Platform

Беттинг платформа с подарками для Telegram. Полнофункциональное веб-приложение с интеграцией Telegram API.

## 🏗️ Архитектура

- **Frontend** (`web/`): React 18 + Socket.io
- **Backend** (`server2/`): FastAPI + Pyrogram + PostgreSQL
- **Deployment**: Готов для Render.com + Vercel

## 🚀 Быстрый старт

### 1. Клонирование
```bash
git clone https://github.com/Abdurozdik/GIFT_ZONA_TEST.git
cd GIFT_ZONA_TEST
```

### 2. Настройка бэкенда
```bash
cd server2
pip install -r requirements.txt
cp env.example .env
# Заполните .env файл
python main.py
```

### 3. Настройка фронтенда
```bash
cd web
npm install
npm start
```

## 🔧 Настройка Telegram

1. Получите API_ID и API_HASH с https://my.telegram.org
2. Создайте бота через @BotFather
3. Запустите `python create_session.py` для получения session string

## 📦 Деплой

### Backend (Render.com)
1. Подключите GitHub репозиторий
2. Выберите папку `server2`
3. Добавьте переменные окружения
4. Подключите PostgreSQL

### Frontend (Vercel)
1. Подключите GitHub репозиторий  
2. Выберите папку `web`
3. Настройте переменные окружения

## 🎮 Функции

- ✅ Telegram авторизация
- ✅ Система ставок
- ✅ Депозиты и подарки
- ✅ WebSocket в реальном времени
- ✅ Админ панель
- ✅ Мобильная адаптация

## 📝 Лицензия

MIT License - используйте свободно!

---

**Создано с ❤️ для Telegram беттинга** 