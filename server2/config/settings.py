#!/usr/bin/env python3
"""
Конфигурация приложения
Централизованное управление настройками
"""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Настройки приложения"""
    
    # Базовые настройки
    APP_NAME: str = "GIFT ZONA Betting Platform"
    VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # База данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Telegram API
    API_ID: int = int(os.getenv("API_ID", "0"))
    API_HASH: str = os.getenv("API_HASH", "")
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    PYROGRAM_SESSION_STRING: str = os.getenv("PYROGRAM_SESSION_STRING", "")
    
    # JWT и безопасность
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")
    ADMIN_JWT_SECRET: str = os.getenv("ADMIN_JWT_SECRET", "admin-secret")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    ALLOWED_ORIGINS: list = [
        FRONTEND_URL, 
        "https://gift-zona-frontend.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001"
    ]
    
    # Rate Limiting
    WITHDRAWAL_RATE_LIMIT: int = int(os.getenv("WITHDRAWAL_RATE_LIMIT", "10"))
    RATE_LIMIT_PERIOD: int = int(os.getenv("RATE_LIMIT_PERIOD", "300"))  # 5 минут
    
    # Цены подарков
    PRICE_UPDATE_INTERVAL: int = int(os.getenv("PRICE_UPDATE_INTERVAL", "30"))  # минуты
    PORTAL_API_URL: str = os.getenv("PORTAL_API_URL", "")
    PORTAL_API_KEY: str = os.getenv("PORTAL_API_KEY", "")
    
    # Redis (опционально)
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")
    
    # Логирование
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = int(os.getenv("WS_HEARTBEAT_INTERVAL", "30"))
    
    def validate(self) -> bool:
        """Проверка обязательных настроек"""
        required_settings = [
            ("DATABASE_URL", self.DATABASE_URL),
            ("API_ID", self.API_ID),
            ("API_HASH", self.API_HASH),
            ("BOT_TOKEN", self.BOT_TOKEN),
        ]
        
        missing = []
        for name, value in required_settings:
            if not value:
                missing.append(name)
        
        if missing:
            print(f"❌ Отсутствуют обязательные настройки: {', '.join(missing)}")
            return False
            
        return True

# Глобальный экземпляр настроек
settings = Settings()

