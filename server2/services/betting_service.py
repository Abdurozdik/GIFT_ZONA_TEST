#!/usr/bin/env python3
"""
Сервис беттинга - ставки на события
НОВЫЙ функционал для беттинг платформы
"""

import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
from models.database import db_manager, execute_query, execute_single, execute_insert

class BettingService:
    """Сервис для работы со ставками на события"""
    
    def __init__(self):
        pass
    
    async def get_active_events(self) -> List[Dict]:
        """Получение активных событий для ставок"""
        try:
            events = await execute_query("""
                SELECT id, title, description, outcomes, coefficients, 
                       total_bank, status, end_time, created_at
                FROM events 
                WHERE status IN ('waiting', 'active') 
                AND end_time > NOW()
                ORDER BY end_time ASC
            """)
            
            # Парсим JSON поля
            for event in events:
                if isinstance(event['outcomes'], str):
                    event['outcomes'] = json.loads(event['outcomes'])
                if isinstance(event['coefficients'], str):
                    event['coefficients'] = json.loads(event['coefficients'])
            
            return events
            
        except Exception as e:
            print(f"[BETTING] ❌ Ошибка получения событий: {e}")
            return []
    
    async def place_bet(self, user_id: int, event_id: int, outcome: str, 
                       outcome_index: int, gift_ids: List[int]) -> Dict:
        """Размещение ставки пользователем"""
        try:
            async with db_manager.pool.acquire() as conn:
                async with conn.transaction():
                    # Проверяем событие
                    event = await conn.fetchrow("""
                        SELECT id, title, outcomes, coefficients, status, end_time
                        FROM events WHERE id = $1
                    """, event_id)
                    
                    if not event:
                        return {"success": False, "error": "Событие не найдено"}
                    
                    if event['status'] not in ['waiting', 'active']:
                        return {"success": False, "error": "Ставки на это событие закрыты"}
                    
                    if event['end_time'] <= datetime.now():
                        return {"success": False, "error": "Время для ставок истекло"}
                    
                    # Парсим данные события
                    outcomes = json.loads(event['outcomes']) if isinstance(event['outcomes'], str) else event['outcomes']
                    coefficients = json.loads(event['coefficients']) if isinstance(event['coefficients'], str) else event['coefficients']
                    
                    if outcome_index >= len(outcomes) or outcome_index >= len(coefficients):
                        return {"success": False, "error": "Неверный индекс исхода"}
                    
                    # Проверяем подарки пользователя
                    gift_values = await conn.fetch("""
                        SELECT id, num FROM deposits 
                        WHERE id = ANY($1) AND telegram_user_id = $2
                    """, gift_ids, user_id)
                    
                    if len(gift_values) != len(gift_ids):
                        return {"success": False, "error": "Некоторые подарки не найдены"}
                    
                    # Проверяем, не используются ли подарки в других ставках
                    used_gifts = await conn.fetchval("""
                        SELECT COUNT(*) FROM bets 
                        WHERE user_id = $1 AND status IN ('pending', 'won') 
                        AND gift_ids ?| $2
                    """, user_id, [str(gid) for gid in gift_ids])
                    
                    if used_gifts > 0:
                        return {"success": False, "error": "Некоторые подарки уже используются в других ставках"}
                    
                    # Рассчитываем общую стоимость
                    total_value = sum(gift['num'] for gift in gift_values)
                    coefficient = Decimal(str(coefficients[outcome_index]))
                    potential_payout = int(total_value * coefficient)
                    
                    # Создаем ставку
                    bet_id = await conn.fetchval("""
                        INSERT INTO bets (
                            user_id, event_id, outcome, outcome_index, 
                            gift_ids, total_value, coefficient, potential_payout, status
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                        RETURNING id
                    """, 
                        user_id, event_id, outcome, outcome_index,
                        json.dumps(gift_ids), total_value, coefficient, potential_payout
                    )
                    
                    # Обновляем банк события
                    await conn.execute("""
                        UPDATE events 
                        SET total_bank = total_bank + $1,
                            status = CASE WHEN status = 'waiting' THEN 'active' ELSE status END
                        WHERE id = $2
                    """, total_value, event_id)
                    
                    print(f"[BETTING] ✅ Ставка размещена: ID {bet_id}, сумма {total_value} ⭐")
                    
                    return {
                        "success": True,
                        "bet_id": bet_id,
                        "total_value": total_value,
                        "coefficient": float(coefficient),
                        "potential_payout": potential_payout,
                        "message": f"Ставка на '{outcome}' размещена успешно!"
                    }
                    
        except Exception as e:
            print(f"[BETTING] ❌ Ошибка размещения ставки: {e}")
            return {
                "success": False,
                "error": f"Ошибка сервера: {str(e)}"
            }
    
    async def get_user_bets(self, user_id: int, limit: int = 20) -> List[Dict]:
        """Получение ставок пользователя"""
        try:
            bets = await execute_query("""
                SELECT b.*, e.title as event_title, e.status as event_status
                FROM bets b
                JOIN events e ON b.event_id = e.id
                WHERE b.user_id = $1
                ORDER BY b.created_at DESC
                LIMIT $2
            """, user_id, limit)
            
            # Парсим JSON поля
            for bet in bets:
                if isinstance(bet['gift_ids'], str):
                    bet['gift_ids'] = json.loads(bet['gift_ids'])
            
            return bets
            
        except Exception as e:
            print(f"[BETTING] ❌ Ошибка получения ставок: {e}")
            return []
    
    async def process_event_result(self, event_id: int, winner_index: int, 
                                  result_outcome: str) -> Dict:
        """Обработка результата события"""
        try:
            async with db_manager.pool.acquire() as conn:
                async with conn.transaction():
                    # Обновляем событие
                    await conn.execute("""
                        UPDATE events 
                        SET status = 'finished', 
                            winner_index = $1, 
                            result_outcome = $2,
                            updated_at = NOW()
                        WHERE id = $3
                    """, winner_index, result_outcome, event_id)
                    
                    # Получаем все ставки на это событие
                    all_bets = await conn.fetch("""
                        SELECT id, user_id, outcome_index, total_value, potential_payout
                        FROM bets 
                        WHERE event_id = $1 AND status = 'pending'
                    """, event_id)
                    
                    winners_count = 0
                    losers_count = 0
                    total_payouts = 0
                    
                    for bet in all_bets:
                        if bet['outcome_index'] == winner_index:
                            # Выигрышная ставка
                            await conn.execute("""
                                UPDATE bets 
                                SET status = 'won', 
                                    actual_payout = potential_payout,
                                    updated_at = NOW()
                                WHERE id = $1
                            """, bet['id'])
                            
                            winners_count += 1
                            total_payouts += bet['potential_payout']
                        else:
                            # Проигрышная ставка
                            await conn.execute("""
                                UPDATE bets 
                                SET status = 'lost', 
                                    actual_payout = 0,
                                    updated_at = NOW()
                                WHERE id = $1
                            """, bet['id'])
                            
                            losers_count += 1
                    
                    print(f"[BETTING] ✅ Событие {event_id} обработано:")
                    print(f"[BETTING] - Победителей: {winners_count}")
                    print(f"[BETTING] - Проигравших: {losers_count}")
                    print(f"[BETTING] - Общие выплаты: {total_payouts} ⭐")
                    
                    return {
                        "success": True,
                        "winners_count": winners_count,
                        "losers_count": losers_count,
                        "total_payouts": total_payouts,
                        "message": f"Результат события обработан: {result_outcome}"
                    }
                    
        except Exception as e:
            print(f"[BETTING] ❌ Ошибка обработки результата: {e}")
            return {
                "success": False,
                "error": f"Ошибка сервера: {str(e)}"
            }
    
    async def get_event_stats(self, event_id: int) -> Dict:
        """Статистика события"""
        try:
            stats = await execute_single("""
                SELECT 
                    COUNT(*) as total_bets,
                    COUNT(DISTINCT user_id) as unique_users,
                    SUM(total_value) as total_volume,
                    AVG(total_value) as avg_bet_size
                FROM bets 
                WHERE event_id = $1
            """, event_id)
            
            # Статистика по исходам
            outcome_stats = await execute_query("""
                SELECT 
                    outcome, outcome_index,
                    COUNT(*) as bets_count,
                    SUM(total_value) as total_value
                FROM bets 
                WHERE event_id = $1 
                GROUP BY outcome, outcome_index
                ORDER BY outcome_index
            """, event_id)
            
            return {
                "total_stats": stats or {},
                "outcome_stats": outcome_stats
            }
            
        except Exception as e:
            print(f"[BETTING] ❌ Ошибка получения статистики: {e}")
            return {"total_stats": {}, "outcome_stats": []}

# Глобальный экземпляр сервиса
betting_service = BettingService()

