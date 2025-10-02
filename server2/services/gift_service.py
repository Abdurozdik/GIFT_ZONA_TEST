#!/usr/bin/env python3
"""
Сервис для работы с подарками
Депозиты, выводы, управление балансом
Адаптировано из main.py и withdrawal_service.py
"""

import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
from models.database import db_manager, execute_query, execute_single, execute_insert
from utils.telegram import send_telegram_message

class GiftService:
    """Сервис для работы с подарками Telegram"""
    
    def __init__(self, telegram_client=None):
        self.telegram_client = telegram_client
    
    async def process_deposit(self, gift_data: Dict, sender_id: int, message_id: int) -> Dict:
        """
        Обработка депозита подарка
        Адаптировано из main.py строки 620-640
        """
        try:
            gift_slug = gift_data.get("name", "")
            gift_title = gift_data.get("title", "")
            gift_num = gift_data.get("collectible_id", 0)
            transfer_price = gift_data.get("transfer_price", 0)
            
            print(f"[GIFT] 💎 Обработка депозита:")
            print(f"[GIFT] - Пользователь: {sender_id}")
            print(f"[GIFT] - Подарок: {gift_title} ({gift_slug})")
            print(f"[GIFT] - Стоимость: {transfer_price} звезд")
            
            if not sender_id or not gift_slug or transfer_price <= 0:
                return {
                    "success": False,
                    "error": "Недостаточно данных для депозита"
                }
            
            async with db_manager.pool.acquire() as conn:
                async with conn.transaction():
                    # Проверяем дубли по message_id
                    existing = await conn.fetchrow(
                        "SELECT id FROM deposits WHERE message_id = $1",
                        message_id
                    )
                    
                    if existing:
                        print(f"[GIFT] ⚠️ Дубль депозита, message_id: {message_id}")
                        return {
                            "success": False,
                            "error": "Депозит уже обработан"
                        }
                    
                    # Сохраняем депозит
                    deposit_row = await conn.fetchrow("""
                        INSERT INTO deposits (telegram_user_id, title, slug, num, message_id)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id
                    """, sender_id, gift_title, gift_slug, transfer_price, message_id)
                    
                    deposit_id = deposit_row['id']
                    
                    # Сохраняем транзакцию
                    await conn.execute("""
                        INSERT INTO transactions (
                            user_id, type, gift_title, gift_slug, gift_value, 
                            stars_paid, status, telegram_message_id, notes
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """, 
                        sender_id, 'deposit', gift_title, gift_slug, transfer_price,
                        transfer_price, 'completed', message_id, 
                        f'Автоматический депозит пользователя {sender_id}'
                    )
                    
                    print(f"[GIFT] ✅ Депозит сохранен: ID {deposit_id}")
                    
                    # Отправляем подтверждение
                    if self.telegram_client:
                        try:
                            await send_telegram_message(
                                self.telegram_client, 
                                sender_id,
                                f"✅ Подарок '{gift_title}' успешно зачислен! "
                                f"Стоимость: {transfer_price} ⭐"
                            )
                        except Exception as e:
                            print(f"[GIFT] ⚠️ Не удалось отправить подтверждение: {e}")
                    
                    return {
                        "success": True,
                        "deposit_id": deposit_id,
                        "message": f"Депозит {gift_title} успешно обработан"
                    }
                    
        except Exception as e:
            print(f"[GIFT] ❌ Ошибка обработки депозита: {e}")
            return {
                "success": False,
                "error": f"Ошибка сервера: {str(e)}"
            }
    
    async def get_user_deposits(self, user_id: int) -> List[Dict]:
        """
        Получение депозитов пользователя
        Адаптировано из main.py строки 680-684
        """
        try:
            deposits = await execute_query("""
                SELECT id, title, slug, num, created_at, 
                       true as can_withdraw
                FROM deposits 
                WHERE telegram_user_id = $1 
                ORDER BY created_at DESC
            """, user_id)
            
            return deposits
            
        except Exception as e:
            print(f"[GIFT] ❌ Ошибка получения депозитов: {e}")
            return []
    
    async def get_user_balance(self, user_id: int) -> Dict:
        """Получение баланса пользователя в звездах"""
        try:
            # Общий баланс из депозитов
            total_deposited = await execute_single("""
                SELECT COALESCE(SUM(num), 0) as total
                FROM deposits 
                WHERE telegram_user_id = $1
            """, user_id)
            
            # Потраченные средства (ставки)
            total_spent = await execute_single("""
                SELECT COALESCE(SUM(total_value), 0) as total
                FROM bets 
                WHERE user_id = $1 AND status != 'cancelled'
            """, user_id)
            
            # Выигрыши
            total_won = await execute_single("""
                SELECT COALESCE(SUM(actual_payout), 0) as total
                FROM bets 
                WHERE user_id = $1 AND status = 'won'
            """, user_id)
            
            deposited = total_deposited['total'] if total_deposited else 0
            spent = total_spent['total'] if total_spent else 0
            won = total_won['total'] if total_won else 0
            
            available_balance = deposited - spent + won
            
            return {
                "total_deposited": deposited,
                "total_spent": spent,
                "total_won": won,
                "available_balance": max(0, available_balance)
            }
            
        except Exception as e:
            print(f"[GIFT] ❌ Ошибка расчета баланса: {e}")
            return {
                "total_deposited": 0,
                "total_spent": 0,
                "total_won": 0,
                "available_balance": 0
            }
    
    async def process_withdrawal(self, deposit_id: int, recipient_user_id: int, owner_user_id: int) -> Dict:
        """
        Обработка вывода подарка
        Адаптировано из withdrawal_service.py
        """
        try:
            async with db_manager.pool.acquire() as conn:
                async with conn.transaction():
                    # Получаем информацию о депозите
                    deposit = await conn.fetchrow(
                        "SELECT * FROM deposits WHERE id = $1", 
                        deposit_id
                    )
                    
                    if not deposit:
                        return {
                            "success": False,
                            "error": "Депозит не найден"
                        }
                    
                    # Проверяем права на вывод
                    if deposit['telegram_user_id'] != owner_user_id:
                        return {
                            "success": False,
                            "error": "Нет прав на вывод этого подарка"
                        }
                    
                    # Проверяем, не был ли уже выведен
                    existing_withdrawal = await conn.fetchrow("""
                        SELECT id FROM transactions 
                        WHERE telegram_message_id = $1 AND type = 'withdrawal' 
                        AND status = 'completed'
                        LIMIT 1
                    """, deposit['message_id'])
                    
                    if existing_withdrawal:
                        return {
                            "success": False,
                            "error": "Подарок уже был выведен"
                        }
                    
                    # Создаем транзакцию вывода
                    await conn.execute("""
                        INSERT INTO transactions (
                            user_id, type, gift_title, gift_slug, gift_value,
                            recipient_user_id, status, telegram_message_id, notes
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                        owner_user_id, 'withdrawal', deposit['title'], 
                        deposit['slug'], deposit['num'], recipient_user_id,
                        'pending', deposit['message_id'],
                        f'Вывод подарка пользователю {recipient_user_id}'
                    )
                    
                    # TODO: Интеграция с Telegram API для отправки подарка
                    # Пока что помечаем как выполненную
                    await conn.execute("""
                        UPDATE transactions 
                        SET status = 'completed', notes = notes || ' [SIMULATED]'
                        WHERE telegram_message_id = $1 AND type = 'withdrawal'
                    """, deposit['message_id'])
                    
                    print(f"[GIFT] ✅ Вывод обработан: {deposit['title']} -> {recipient_user_id}")
                    
                    return {
                        "success": True,
                        "message": f"Подарок '{deposit['title']}' отправлен пользователю {recipient_user_id}"
                    }
                    
        except Exception as e:
            print(f"[GIFT] ❌ Ошибка вывода: {e}")
            return {
                "success": False,
                "error": f"Ошибка сервера: {str(e)}"
            }
    
    async def get_withdrawal_history(self, user_id: int) -> List[Dict]:
        """История выводов пользователя"""
        try:
            history = await execute_query("""
                SELECT * FROM transactions 
                WHERE user_id = $1 AND type = 'withdrawal' 
                ORDER BY created_at DESC
            """, user_id)
            
            return history
            
        except Exception as e:
            print(f"[GIFT] ❌ Ошибка получения истории: {e}")
            return []

# Глобальный экземпляр сервиса
gift_service = GiftService()

