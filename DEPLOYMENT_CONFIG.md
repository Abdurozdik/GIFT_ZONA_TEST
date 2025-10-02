# 🚀 DEPLOYMENT CONFIGURATION

## 📋 Environment Variables для Render.com (Backend)

```env
# === TELEGRAM API ===
API_ID=26523548
API_HASH=39e0015dc974819de5d554c0d54d051c
BOT_TOKEN=8352420850:AAFLZPgt4WORqoSSJnD340_OMa8C6LOrk-mQ
PYROGRAM_SESSION_STRING=AgGUt5wAQP8shJHIZUCruHU73WHYzptbcE2mUAFFwSNxPDnmjPcFgkfmfq5SfbOaWswKULU1nzn5UD6BelrOHxUkqwAN2ygFBl7EXnAsaSzxNtGXTMpBGbwCiluVPhObJ37oH2XUn5xsXRHgZN8qccl7okecCLFmgJXOzK3MSExG22QKa0jf1qtN5CK0g3h57zLxtOy6fkM24tA1Dyncmc94EBW7MvYRH6q3PZbokrzGrBx5D88IOGjU5Dv6MEPCjOIRXLcRbdY4KxOezrlE-H9XU2IqTD-z84eYlrk_mbfFvbTzEchmitLqIRB06O-DPrawMtoDgShmfTqYaUJ973JrgDj3-AAAAAAsCBDBAA

# === JWT И БЕЗОПАСНОСТЬ ===
JWT_SECRET=gift_zona_jwt_secret_key_2024_secure
ADMIN_JWT_SECRET=gift_zona_admin_jwt_secret_2024_secure
ADMIN_PASSWORD=GiftZona2024Admin!

# === НАСТРОЙКИ СЕРВЕРА ===
NODE_ENV=production
PORT=4000
LOG_LEVEL=INFO

# === CORS И ФРОНТЕНД ===
FRONTEND_URL=https://gift-zona-test.vercel.app

# === RATE LIMITING ===
WITHDRAWAL_RATE_LIMIT=10
RATE_LIMIT_PERIOD=300

# === ЦЕНЫ ПОДАРКОВ ===
PRICE_UPDATE_INTERVAL=30
```

## 🌐 Environment Variables для Vercel (Frontend)

```env
REACT_APP_API_URL=https://gift-zona-test-server.onrender.com
REACT_APP_WS_URL=wss://gift-zona-test-server.onrender.com
REACT_APP_BOT_USERNAME=@gift_zona_test_bot
```

## 📝 Инструкции по деплою

### 1. Render.com (Backend)
1. Зайди на https://render.com
2. New → Web Service
3. Connect GitHub: `GIFT_ZONA_TEST`
4. Root Directory: `server2`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `python main.py`
7. Добавь все переменные из секции выше

### 2. Vercel (Frontend)
1. Зайди на https://vercel.com
2. New Project
3. Import `GIFT_ZONA_TEST`
4. Root Directory: `web`
5. Framework: Create React App
6. Добавь переменные окружения из секции выше

### 3. База данных
В Render создай PostgreSQL database и подключи к Web Service. 