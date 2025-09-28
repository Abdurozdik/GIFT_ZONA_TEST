#!/usr/bin/env python3
"""
Скрипт для создания Pyrogram session string
Для использования с Telegram API
"""

import asyncio
from pyrogram import Client

async def create_session():
    """Создает session string для Pyrogram"""
    
    print("🔐 Создание Pyrogram Session String")
    print("=" * 50)
    
    # Запрашиваем данные у пользователя
    api_id = input("Введи API_ID: ").strip()
    api_hash = input("Введи API_HASH: ").strip()
    
    if not api_id or not api_hash:
        print("❌ API_ID и API_HASH обязательны!")
        return
    
    try:
        api_id = int(api_id)
    except ValueError:
        print("❌ API_ID должен быть числом!")
        return
    
    print("\n📱 Сейчас откроется авторизация...")
    print("Введи свой номер телефона в формате +7XXXXXXXXXX")
    
    # Создаем временного клиента
    async with Client(
        name="temp_session",
        api_id=api_id,
        api_hash=api_hash,
        in_memory=True
    ) as client:
        
        # Получаем session string
        session_string = await client.export_session_string()
        
        print("\n✅ Session String успешно создан!")
        print("=" * 50)
        print("PYROGRAM_SESSION_STRING:")
        print(session_string)
        print("=" * 50)
        print("\n📋 Скопируй эту строку и добавь в Environment Variables на Render")
        
        # Сохраняем в файл
        with open("session_string.txt", "w") as f:
            f.write(session_string)
        
        print("💾 Также сохранено в файл: session_string.txt")

if __name__ == "__main__":
    asyncio.run(create_session())
