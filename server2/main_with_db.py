#!/usr/bin/env python3
"""
GIFT ZONA Betting Platform - Новая архитектура
Рефакторинг монолитного main.py в модульную структуру
"""

import os
import asyncio
import signal
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Конфигурация и модели
from config.settings import settings
from models.database import db_manager

# Сервисы
from services.gift_service import gift_service
from services.betting_service import betting_service

# API роутеры
from api.deposits import router as deposits_router
from api.betting import router as betting_router

# Утилиты
from utils.telegram import validate_telegram_init_data

# Telegram клиент (из оригинального main.py)
from pyrogram import Client, filters
import json
import time

# Настройка логирования
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Отключаем лишние логи Pyrogram
logging.getLogger("pyrogram").setLevel(logging.WARNING)
logging.getLogger("pyrogram.session.session").setLevel(logging.ERROR)
logging.getLogger("pyrogram.connection.connection").setLevel(logging.ERROR)

# Глобальные переменные
telegram_client = None
telegram_client_available = False
shutdown_requested = False

def signal_handler(signum, frame):
    """Graceful shutdown handler"""
    global shutdown_requested
    print(f"[SIGNAL] Получен сигнал {signum}, инициируется graceful shutdown...")
    shutdown_requested = True

# Регистрируем обработчики сигналов
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    print(f"[STARTUP] 🚀 Запуск {settings.APP_NAME} v{settings.VERSION}")
    
    # Проверяем настройки
    if not settings.validate():
        raise Exception("❌ Некорректные настройки приложения")
    
    # Инициализация базы данных
    print("[STARTUP] 📊 Инициализация базы данных...")
    await db_manager.initialize()
    
    # Инициализация Telegram клиента
    print("[STARTUP] 📱 Инициализация Telegram клиента...")
    await init_telegram_client()
    
    # Инициализация сервисов
    print("[STARTUP] 🛠️ Инициализация сервисов...")
    gift_service.telegram_client = telegram_client
    
    print(f"[STARTUP] ✅ {settings.APP_NAME} успешно запущен!")
    
    yield  # Здесь приложение работает
    
    # Shutdown
    print("[SHUTDOWN] 🛑 Graceful shutdown...")
    
    # Остановка Telegram клиента
    if telegram_client and telegram_client.is_connected:
        try:
            await telegram_client.stop()
            print("[SHUTDOWN] ✅ Telegram клиент остановлен")
        except Exception as e:
            print(f"[SHUTDOWN] ⚠️ Ошибка остановки Telegram: {e}")
    
    # Закрытие базы данных
    await db_manager.close()
    print("[SHUTDOWN] ✅ Shutdown завершен")

async def init_telegram_client():
    """Инициализация Telegram клиента"""
    global telegram_client, telegram_client_available
    
    try:
        if not settings.PYROGRAM_SESSION_STRING:
            print("[TELEGRAM] ⚠️ PYROGRAM_SESSION_STRING не настроен")
            return
        
        # Создаем клиента
        telegram_client = Client(
            name=f"gift_zona_{int(time.time())}",
            api_id=settings.API_ID,
            api_hash=settings.API_HASH,
            session_string=settings.PYROGRAM_SESSION_STRING,
            workdir="/tmp",
            no_updates=False,
            takeout=False,
            sleep_threshold=60,
            workers=1,
            max_concurrent_transmissions=1
        )
        
        # Запускаем клиента
        await telegram_client.start()
        telegram_client_available = True
        
        # Проверяем подключение
        me = await telegram_client.get_me()
        print(f"[TELEGRAM] ✅ Подключен как: {me.first_name} (@{me.username}, ID: {me.id})")
        
        # Регистрируем обработчики сообщений
        await setup_telegram_handlers()
        
    except Exception as e:
        print(f"[TELEGRAM] ❌ Ошибка инициализации: {e}")
        telegram_client_available = False

async def setup_telegram_handlers():
    """Настройка обработчиков Telegram сообщений"""
    
    @telegram_client.on_message(filters.all)
    async def handle_gift_deposit(client, message):
        """Обработчик депозитов подарков"""
        try:
            # Проверяем, что это подарок
            if (hasattr(message, 'service') and 
                message.service and 
                str(message.service) == "MessageServiceType.GIFT" and
                hasattr(message, 'gift') and 
                message.gift):
                
                print(f"[TELEGRAM] 🎁 Обнаружен депозит подарка!")
                
                # Парсим данные подарка
                gift_data = json.loads(str(message.gift))
                sender_id = message.from_user.id if message.from_user else None
                
                if sender_id:
                    # Обрабатываем через сервис
                    result = await gift_service.process_deposit(
                        gift_data, sender_id, message.id
                    )
                    
                    if result["success"]:
                        print(f"[TELEGRAM] ✅ Депозит обработан: {result['message']}")
                    else:
                        print(f"[TELEGRAM] ❌ Ошибка депозита: {result['error']}")
                
        except Exception as e:
            print(f"[TELEGRAM] ❌ Ошибка обработки сообщения: {e}")
    
    print("[TELEGRAM] ✅ Обработчики сообщений зарегистрированы")

# Создаем FastAPI приложение
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Беттинг платформа с подарками Telegram",
    lifespan=lifespan
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(deposits_router)
app.include_router(betting_router)

# Базовые endpoints
@app.get("/")
async def root():
    """Статус сервера"""
    return {
        "status": f"{settings.APP_NAME} is running!",
        "version": settings.VERSION,
        "telegram_available": telegram_client_available,
        "telegram_connected": telegram_client_available and telegram_client and telegram_client.is_connected
    }

@app.get("/health")
async def health_check():
    """Health check для мониторинга"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "database": db_manager.pool is not None,
            "telegram": telegram_client_available
        }
    }

@app.post("/api/auth/telegram")
async def authenticate_telegram(request: Request):
    """Аутентификация через Telegram WebApp"""
    try:
        body = await request.json()
        init_data = body.get("initData")
        
        if not init_data:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Отсутствует initData"}
            )
        
        user_data = validate_telegram_init_data(init_data)
        
        if not user_data:
            return JSONResponse(
                status_code=401,
                content={"success": False, "error": "Некорректные данные Telegram"}
            )
        
        # Сохраняем/обновляем профиль пользователя
        user_id = user_data.get('id')
        if user_id:
            from models.database import execute_single
            
            await execute_single("""
                INSERT INTO user_profiles (
                    user_id, first_name, last_name, username, 
                    photo_url, is_premium
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    username = EXCLUDED.username,
                    photo_url = EXCLUDED.photo_url,
                    is_premium = EXCLUDED.is_premium,
                    updated_at = NOW()
            """, 
                user_id, 
                user_data.get('first_name'),
                user_data.get('last_name'),
                user_data.get('username'),
                user_data.get('photo_url'),
                user_data.get('is_premium', False)
            )
        
        return {
            "success": True,
            "user": user_data,
            "message": "Аутентификация успешна"
        }
        
    except Exception as e:
        print(f"[AUTH] ❌ Ошибка аутентификации: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Ошибка сервера"}
        )

# WebSocket endpoint (упрощенная версия)
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket для реал-тайм обновлений"""
    await websocket.accept()
    
    try:
        while True:
            # Простой ping-pong
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})
            
    except WebSocketDisconnect:
        print("[WS] Клиент отключился")
    except Exception as e:
        print(f"[WS] Ошибка WebSocket: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "4000")),
        reload=settings.DEBUG
    )

