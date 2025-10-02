#!/usr/bin/env python3
"""
Утилиты для работы с Telegram API
Вынесено из main.py для переиспользования
"""

import asyncio
import httpx
from typing import Optional, Dict, Any
from config.settings import settings

async def send_telegram_message(client, user_id: int, message: str) -> bool:
    """Отправка сообщения пользователю через Pyrogram"""
    try:
        if not client or not client.is_connected:
            print(f"[TELEGRAM] ⚠️ Клиент не подключен")
            return False
        
        await client.send_message(user_id, message)
        print(f"[TELEGRAM] ✅ Сообщение отправлено пользователю {user_id}")
        return True
        
    except Exception as e:
        print(f"[TELEGRAM] ❌ Ошибка отправки сообщения: {e}")
        return False

async def get_user_avatar_file_id(user_id: int, bot_token: str = None) -> Optional[str]:
    """
    Получение file_id аватара пользователя через Bot API
    Адаптировано из main.py строки 133-167
    """
    if not bot_token:
        bot_token = settings.BOT_TOKEN
        
    if not bot_token:
        return None
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{bot_token}/getUserProfilePhotos",
                json={
                    "user_id": user_id,
                    "limit": 1
                }
            )
            
            if response.status_code != 200:
                return None
                
            data = response.json()
            if not data.get("ok") or not data.get("result", {}).get("photos"):
                return None
                
            photos = data["result"]["photos"]
            if photos and len(photos) > 0 and len(photos[0]) > 0:
                largest_photo = photos[0][-1]
                return largest_photo.get("file_id")
                
        return None
        
    except Exception as e:
        print(f"[TELEGRAM] ❌ Ошибка получения аватара для {user_id}: {e}")
        return None

async def create_payment_invoice(gift_ids: list, user_id: int, bot_token: str = None) -> Dict:
    """
    Создание invoice для оплаты Telegram Stars
    Адаптировано из main.py строки 802-868
    """
    if not bot_token:
        bot_token = settings.BOT_TOKEN
        
    if not bot_token:
        return {"success": False, "error": "BOT_TOKEN не настроен"}
    
    try:
        import time
        
        total_stars = len(gift_ids) * 25
        timestamp = int(time.time())
        payload = f"withdrawal_{user_id}_{timestamp}_{','.join(map(str, gift_ids))}"
        
        invoice_data = {
            "title": "Вывод подарков GIFT ZONA",
            "description": f"Вывод {len(gift_ids)} подарков за {total_stars} звезд",
            "payload": payload,
            "provider_token": "",  # Для Telegram Stars
            "currency": "XTR",  # Telegram Stars
            "prices": [
                {
                    "label": f"Вывод {len(gift_ids)} подарков",
                    "amount": total_stars
                }
            ],
            "start_parameter": f"withdrawal_{user_id}",
            "photo_url": "https://via.placeholder.com/100x100.png?text=🎁",
            "photo_width": 100,
            "photo_height": 100,
            "need_name": False,
            "need_phone_number": False,
            "need_email": False,
            "need_shipping_address": False,
            "send_phone_number_to_provider": False,
            "send_email_to_provider": False,
            "is_flexible": False
        }
        
        async with httpx.AsyncClient() as client:
            url = f"https://api.telegram.org/bot{bot_token}/createInvoiceLink"
            response = await client.post(url, json=invoice_data)
            result = await response.json()
            
            if response.status_code == 200 and result.get('ok'):
                return {
                    "success": True,
                    "invoice_url": result["result"],
                    "total_stars": total_stars,
                    "payload": payload
                }
            else:
                print(f"[TELEGRAM] ❌ Ошибка создания invoice: {result}")
                return {
                    "success": False, 
                    "error": f"Не удалось создать invoice: {result.get('description', 'Неизвестная ошибка')}"
                }
                
    except Exception as e:
        print(f"[TELEGRAM] ❌ Исключение при создании invoice: {e}")
        return {
            "success": False,
            "error": f"Ошибка сервера: {str(e)}"
        }

def validate_telegram_init_data(init_data: str) -> Optional[Dict]:
    """
    Валидация данных от Telegram WebApp
    TODO: Реализовать проверку подписи
    """
    try:
        # Упрощенная версия - в продакшене нужна проверка HMAC
        from urllib.parse import parse_qs, unquote
        
        parsed = parse_qs(init_data)
        
        if 'user' not in parsed:
            return None
            
        import json
        user_data = json.loads(unquote(parsed['user'][0]))
        
        return user_data
        
    except Exception as e:
        print(f"[TELEGRAM] ❌ Ошибка валидации init_data: {e}")
        return None

