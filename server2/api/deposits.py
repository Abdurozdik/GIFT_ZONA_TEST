#!/usr/bin/env python3
"""
API для работы с депозитами подарков
Вынесено из main.py для лучшей организации
"""

from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Any
from services.gift_service import gift_service
from utils.telegram import create_payment_invoice

router = APIRouter(prefix="/api/deposits", tags=["deposits"])

@router.get("/{user_id}")
async def get_user_deposits(user_id: int) -> List[Dict]:
    """
    Получение депозитов пользователя
    Адаптировано из main.py строки 680-684
    """
    try:
        deposits = await gift_service.get_user_deposits(user_id)
        return deposits
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения депозитов: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.get("/{user_id}/balance")
async def get_user_balance(user_id: int) -> Dict:
    """Получение баланса пользователя"""
    try:
        balance = await gift_service.get_user_balance(user_id)
        return {
            "success": True,
            "balance": balance
        }
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения баланса: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.get("/withdrawable/{user_id}")
async def get_withdrawable_deposits(user_id: int) -> Dict:
    """
    Депозиты доступные для вывода
    Адаптировано из main.py строки 747-761
    """
    try:
        deposits = await gift_service.get_user_deposits(user_id)
        
        return {
            "success": True,
            "deposits": deposits,
            "withdrawable_count": len(deposits)
        }
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения депозитов для вывода: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.post("/withdrawal/process")
async def process_withdrawal(request: Request) -> Dict:
    """
    Обработка вывода подарка
    Адаптировано из main.py строки 726-745
    """
    try:
        body = await request.json()
        deposit_id = body.get("depositId")
        recipient_user_id = body.get("recipientUserId")
        owner_user_id = body.get("ownerUserId", recipient_user_id)
        
        if not deposit_id or not recipient_user_id:
            raise HTTPException(status_code=400, detail="Отсутствуют обязательные параметры")
        
        # TODO: Добавить rate limiting
        
        result = await gift_service.process_withdrawal(
            deposit_id, recipient_user_id, owner_user_id
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] ❌ Ошибка обработки вывода: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.get("/withdrawal/history/{user_id}")
async def get_withdrawal_history(user_id: int) -> List[Dict]:
    """
    История выводов пользователя
    Адаптировано из main.py строки 763-767
    """
    try:
        history = await gift_service.get_withdrawal_history(user_id)
        return history
        
    except Exception as e:
        print(f"[API] ❌ Ошибка получения истории выводов: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

@router.post("/payment/create-invoice")
async def create_withdrawal_invoice(request: Request) -> Dict:
    """
    Создание invoice для оплаты вывода
    Адаптировано из main.py строки 802-868
    """
    try:
        body = await request.json()
        gift_ids = body.get("giftIds", [])
        user_id = body.get("userId")
        
        if not gift_ids or not user_id:
            raise HTTPException(status_code=400, detail="Отсутствуют giftIds или userId")
        
        result = await create_payment_invoice(gift_ids, user_id)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] ❌ Ошибка создания invoice: {e}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")

