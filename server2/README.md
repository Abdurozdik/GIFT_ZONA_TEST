# 🎯 GIFT ZONA Server

Беттинг платформа с подарками Telegram - серверная часть.

## 🚀 Быстрый деплой на Render

### 1. Подготовка

1. Форкните репозиторий на GitHub
2. Получите Telegram API данные:
   - API_ID и API_HASH с https://my.telegram.org
   - BOT_TOKEN от @BotFather
   - SESSION_STRING запустив `create_new_session_v2.py`

### 2. Деплой

1. Зайдите на https://render.com
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Выберите папку `server2`
5. Настройки:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Environment**: `Python 3`

### 3. Переменные окружения

Добавьте в Render Environment Variables:

```
DATABASE_URL=postgresql://... (автоматически из Render PostgreSQL)
API_ID=12345678
API_HASH=your_api_hash
BOT_TOKEN=123456789:ABCdef...
PYROGRAM_SESSION_STRING=your_session_string
JWT_SECRET=random-secret-key
ADMIN_JWT_SECRET=random-admin-secret
ADMIN_PASSWORD=your-admin-password
FRONTEND_URL=https://your-vercel-app.vercel.app
PORT=4000
```

### 4. База данных

1. В Render создайте PostgreSQL database
2. Подключите к Web Service
3. База данных создастся автоматически при первом запуске

## 🛠️ Локальная разработка

```bash
# Установка зависимостей
pip install -r requirements.txt

# Настройка переменных
cp env.example .env
# Заполните .env файл

# Запуск сервера
python main.py
```

## 📡 API Endpoints

- `GET /` - Статус сервера
- `GET /health` - Health check
- `POST /api/auth/telegram` - Аутентификация
- `GET /api/deposits/{user_id}` - Депозиты пользователя
- `GET /api/betting/events` - Активные события
- `POST /api/betting/bet` - Размещение ставки

## 🔧 Архитектура

```
server2/
├── main.py              # Главный файл FastAPI
├── config/settings.py   # Конфигурация
├── services/            # Бизнес-логика
├── api/                 # API endpoints
├── models/database.py   # База данных
└── utils/               # Утилиты
```

