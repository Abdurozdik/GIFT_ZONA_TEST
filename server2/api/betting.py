#!/usr/bin/env python3
"""
API для беттинга - ставки на события
НОВЫЙ функционал для беттинг платформы
"""

from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any
from services.betting_service import betting_service
from services.gift_service import gift_service

router = APIRouter(prefix="/api/betting", tags=["betting"])

@router.get("/events")
async def get_active_events() -> Dict:
    """Получение активных событий для ставок"""
    try:
        events = await betting_service.get_active_events()
        
        return {
            "success": True,
            "events": events,
            "count": len(events)
        }
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения событий: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.get("/events/{event_id}")
async def get_event_details(event_id: int) -> Dict:
    """Детальная информация о событии"""
    try:
        from models.database import execute_single
        
        event = await execute_single("""
            SELECT id, title, description, outcomes, coefficients, 
                   total_bank, status, end_time, created_at
            FROM events WHERE id = $1
        """, event_id)
        
        if not event:
            raise HTTPException(status_code=404, detail="Событие не найдено")
        
        # Получаем статистику
        stats = await betting_service.get_event_stats(event_id)
        
        return {
            "success": True,
            "event": event,
            "stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] ❌ Ошибка получения события: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.post("/bet")
async def place_bet(request: Request) -> Dict:
    """Размещение ставки пользователем"""
    try:
        body = await request.json()
        
        user_id = body.get("userId")
        event_id = body.get("eventId")
        outcome = body.get("outcome")
        outcome_index = body.get("outcomeIndex")
        gift_ids = body.get("giftIds", [])
        
        if not all([user_id, event_id, outcome, outcome_index is not None, gift_ids]):
            raise HTTPException(status_code=400, detail="Отсутствуют обязательные параметры")
        
        # Проверяем баланс пользователя
        balance = await gift_service.get_user_balance(user_id)
        if balance["available_balance"] <= 0:
            raise HTTPException(status_code=400, detail="Недостаточно средств для ставки")
        
        result = await betting_service.place_bet(
            user_id, event_id, outcome, outcome_index, gift_ids
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] ❌ Ошибка размещения ставки: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.get("/bets/{user_id}")
async def get_user_bets(user_id: int, limit: int = 20) -> Dict:
    """Получение ставок пользователя"""
    try:
        bets = await betting_service.get_user_bets(user_id, limit)
        
        return {
            "success": True,
            "bets": bets,
            "count": len(bets)
        }
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения ставок: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.get("/stats/{user_id}")
async def get_user_betting_stats(user_id: int) -> Dict:
    """Статистика ставок пользователя"""
    try:
        from models.database import execute_single
        
        stats = await execute_single("""
            SELECT 
                COUNT(*) as total_bets,
                COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bets,
                COALESCE(SUM(total_value), 0) as total_wagered,
                COALESCE(SUM(CASE WHEN status = 'won' THEN actual_payout ELSE 0 END), 0) as total_won,
                COALESCE(AVG(total_value), 0) as avg_bet_size
            FROM bets 
            WHERE user_id = $1
        """, user_id)
        
        # Рассчитываем дополнительные метрики
        if stats and stats['total_bets'] > 0:
            win_rate = (stats['won_bets'] / stats['total_bets']) * 100
            profit_loss = stats['total_won'] - stats['total_wagered']
        else:
            win_rate = 0
            profit_loss = 0
        
        return {
            "success": True,
            "stats": {
                **stats,
                "win_rate": round(win_rate, 2),
                "profit_loss": profit_loss
            }
        }
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения статистики: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.get("/leaderboard")
async def get_betting_leaderboard(limit: int = 10) -> Dict:
    """Топ игроков по выигрышам"""
    try:
        from models.database import execute_query
        
        leaderboard = await execute_query("""
            SELECT 
                b.user_id,
                up.first_name,
                up.username,
                COUNT(*) as total_bets,
                COUNT(CASE WHEN b.status = 'won' THEN 1 END) as won_bets,
                COALESCE(SUM(CASE WHEN b.status = 'won' THEN b.actual_payout ELSE 0 END), 0) as total_winnings,
                COALESCE(SUM(b.total_value), 0) as total_wagered
            FROM bets b
            LEFT JOIN user_profiles up ON b.user_id = up.user_id
            WHERE b.status IN ('won', 'lost')
            GROUP BY b.user_id, up.first_name, up.username
            HAVING COUNT(*) >= 3
            ORDER BY total_winnings DESC
            LIMIT $1
        """, limit)
        
        return {
            "success": True,
            "leaderboard": leaderboard
        }
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения лидерборда: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

