#!/usr/bin/env python3
"""
Модели базы данных и подключение
Адаптированы из существующего main.py
"""

import asyncio
import asyncpg
from typing import Optional, Dict, Any, List
from datetime import datetime
from config.settings import settings

class DatabaseManager:
    """Менеджер подключения к базе данных"""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def initialize(self):
        """Инициализация пула соединений"""
        try:
            print("[DB] Создание пула соединений...")
            self.pool = await asyncpg.create_pool(settings.DATABASE_URL)
            print("[DB] ✅ Пул соединений создан")
            
            # Создаем таблицы
            await self.create_tables()
            print("[DB] ✅ Таблицы проверены/созданы")
            
        except Exception as e:
            print(f"[DB] ❌ Ошибка инициализации: {e}")
            raise
    
    async def close(self):
        """Закрытие пула соединений"""
        if self.pool:
            await self.pool.close()
            print("[DB] Пул соединений закрыт")
    
    async def create_tables(self):
        """Создание всех необходимых таблиц"""
        async with self.pool.acquire() as conn:
            # Пользователи (адаптировано из main.py)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_profiles (
                    user_id BIGINT PRIMARY KEY,
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    username VARCHAR(255),
                    photo_url TEXT,
                    photo_file_id VARCHAR(255),
                    is_premium BOOLEAN DEFAULT FALSE,
                    role VARCHAR(20) DEFAULT 'USER',
                    referrer_id BIGINT,
                    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # Депозиты подарков (из main.py)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS deposits (
                    id SERIAL PRIMARY KEY,
                    telegram_user_id BIGINT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255) NOT NULL,
                    num INTEGER NOT NULL,
                    message_id INTEGER,
                    image_document_id VARCHAR(255),
                    image_access_hash VARCHAR(255),
                    image_file_name VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # Транзакции (из main.py)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    deposit_id INTEGER,
                    gift_title VARCHAR(255),
                    gift_slug VARCHAR(255),
                    gift_value INTEGER,
                    stars_paid INTEGER,
                    recipient_user_id BIGINT,
                    transfer_cost INTEGER,
                    status VARCHAR(50) DEFAULT 'pending',
                    telegram_message_id INTEGER,
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # НОВОЕ: События для беттинга
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    outcomes JSONB NOT NULL,
                    coefficients JSONB NOT NULL,
                    total_bank INTEGER DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'waiting',
                    start_time TIMESTAMP WITH TIME ZONE,
                    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
                    result_outcome VARCHAR(255),
                    winner_index INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # НОВОЕ: Ставки
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS bets (
                    id SERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    event_id INTEGER NOT NULL REFERENCES events(id),
                    outcome VARCHAR(255) NOT NULL,
                    outcome_index INTEGER NOT NULL,
                    gift_ids JSONB NOT NULL,
                    total_value INTEGER NOT NULL,
                    coefficient DECIMAL(5,3) NOT NULL,
                    potential_payout INTEGER NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    actual_payout INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # НОВОЕ: Промокоды
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS promocodes (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    value INTEGER NOT NULL,
                    creator_id BIGINT NOT NULL,
                    uses_left INTEGER DEFAULT 1,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # НОВОЕ: Использование промокодов
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS promocode_uses (
                    id SERIAL PRIMARY KEY,
                    promocode_id INTEGER NOT NULL REFERENCES promocodes(id),
                    user_id BIGINT NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(promocode_id, user_id)
                );
            """)
            
            # Цены подарков (из main.py)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS gift_prices (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) UNIQUE NOT NULL,
                    floor_price_ton DECIMAL(10,4) NOT NULL,
                    floor_price_usd DECIMAL(10,2) NOT NULL,
                    ton_usd_rate DECIMAL(10,4) NOT NULL,
                    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # Логи обновления цен (из main.py)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS price_update_logs (
                    id SERIAL PRIMARY KEY,
                    success BOOLEAN NOT NULL,
                    duration_seconds DECIMAL(10,2) NOT NULL,
                    collections_updated INTEGER DEFAULT 0,
                    deposits_updated INTEGER DEFAULT 0,
                    ton_usd_rate DECIMAL(10,4) DEFAULT 0,
                    error_message TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """)
            
            # Создаем индексы
            await self.create_indexes(conn)
    
    async def create_indexes(self, conn):
        """Создание индексов для производительности"""
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_user_profiles_updated ON user_profiles(updated_at)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(telegram_user_id)",
            "CREATE INDEX IF NOT EXISTS idx_deposits_created ON deposits(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)",
            "CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)",
            "CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time)",
            "CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_bets_event_id ON bets(event_id)",
            "CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status)",
            "CREATE INDEX IF NOT EXISTS idx_gift_prices_title ON gift_prices(title)",
            "CREATE INDEX IF NOT EXISTS idx_gift_prices_updated ON gift_prices(last_updated)",
        ]
        
        for index_sql in indexes:
            try:
                await conn.execute(index_sql)
            except Exception as e:
                print(f"[DB] Предупреждение при создании индекса: {e}")

# Глобальный менеджер БД
db_manager = DatabaseManager()

# Вспомогательные функции для работы с БД
async def get_db_connection():
    """Получение соединения из пула"""
    if not db_manager.pool:
        raise Exception("Database pool not initialized")
    return db_manager.pool.acquire()

async def execute_query(query: str, *args) -> List[Dict]:
    """Выполнение SELECT запроса"""
    async with db_manager.pool.acquire() as conn:
        rows = await conn.fetch(query, *args)
        return [dict(row) for row in rows]

async def execute_single(query: str, *args) -> Optional[Dict]:
    """Выполнение запроса, возвращающего одну строку"""
    async with db_manager.pool.acquire() as conn:
        row = await conn.fetchrow(query, *args)
        return dict(row) if row else None

async def execute_insert(query: str, *args) -> int:
    """Выполнение INSERT запроса, возврат ID"""
    async with db_manager.pool.acquire() as conn:
        row = await conn.fetchrow(query + " RETURNING id", *args)
        return row['id'] if row else None

async def execute_update(query: str, *args) -> bool:
    """Выполнение UPDATE/DELETE запроса"""
    async with db_manager.pool.acquire() as conn:
        result = await conn.execute(query, *args)
        return "UPDATE" in result or "DELETE" in result

