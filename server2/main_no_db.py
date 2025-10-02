#!/usr/bin/env python3
"""
GIFT ZONA Betting Platform - Simplified version without database
Для тестирования деплоя без базы данных
"""

import os
import asyncio
import signal
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Глобальные переменные
shutdown_requested = False

def signal_handler(signum, frame):
    """Обработчик сигналов для graceful shutdown"""
    global shutdown_requested
    logger.info(f"[SIGNAL] Получен сигнал {signum}, инициирую shutdown...")
    shutdown_requested = True

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Управление жизненным циклом приложения"""
    logger.info("🚀 Запуск GIFT ZONA (без БД)")
    
    yield  # Здесь приложение работает
    
    logger.info("🛑 Graceful shutdown...")

# Создание FastAPI приложения
app = FastAPI(
    title="GIFT ZONA API",
    description="Беттинг платформа с подарками Telegram (тестовая версия)",
    version="2.0.0-test",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Базовые endpoints
@app.get("/")
async def root():
    """Главная страница API"""
    return {
        "message": "🎯 GIFT ZONA API работает!",
        "version": "2.0.0-test",
        "status": "healthy",
        "database": "disabled"
    }

@app.get("/health")
async def health_check():
    """Health check для мониторинга"""
    return {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time(),
        "database": "disabled"
    }

@app.get("/api/status")
async def api_status():
    """Статус API"""
    return {
        "api": "online",
        "telegram": "disabled",
        "database": "disabled",
        "version": "2.0.0-test"
    }

# Telegram auth endpoint (заглушка)
@app.post("/api/auth/telegram")
async def telegram_auth(request: Request):
    """Заглушка для Telegram авторизации"""
    try:
        body = await request.json()
        return {
            "success": True,
            "message": "Авторизация отключена в тестовой версии",
            "user": {
                "id": 12345,
                "first_name": "Test User",
                "username": "testuser"
            }
        }
    except Exception as e:
        logger.error(f"Ошибка авторизации: {e}")
        return {"success": False, "error": "Ошибка авторизации"}

# Deposits endpoint (заглушка)
@app.get("/api/deposits/{user_id}")
async def get_user_deposits(user_id: int):
    """Заглушка для депозитов"""
    return {
        "deposits": [],
        "total_balance": 0,
        "message": "База данных отключена"
    }

# Events endpoint (заглушка)
@app.get("/api/betting/events")
async def get_events():
    """Заглушка для событий"""
    return {
        "events": [],
        "message": "База данных отключена"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"🚀 Запуск сервера на порту {port}")
    
    uvicorn.run(
        "main_no_db:app",
        host="0.0.0.0",
        port=port,
        reload=False
    ) 