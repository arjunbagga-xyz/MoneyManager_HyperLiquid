import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import os
import json

router = APIRouter()

async def log_and_status_generator(bot_id: int):
    log_file = f"bot_logs/bot_{bot_id}.log"
    status_file = f"bot_status/bot_{bot_id}.json"

    # Ensure files exist to avoid immediate errors
    if not os.path.exists(log_file):
        with open(log_file, 'w') as f:
            f.write("Log file created.")

    if not os.path.exists(status_file):
        with open(status_file, 'w') as f:
            json.dump({"status": "initializing"}, f)

    log_f = open(log_file, 'r')
    status_f = open(status_file, 'r')

    try:
        while True:
            # Check for new log lines
            log_line = log_f.readline()
            if log_line:
                yield json.dumps({"type": "log", "data": log_line.strip()})

            # Check for new status updates
            status_f.seek(0)
            status_content = status_f.read()
            if status_content:
                try:
                    status_data = json.loads(status_content)
                    yield json.dumps({"type": "status", "data": status_data})
                except json.JSONDecodeError:
                    pass # Ignore if file is being written

            await asyncio.sleep(1)
    finally:
        log_f.close()
        status_f.close()

@router.websocket("/ws/bots/{bot_id}/dashboard")
async def websocket_bot_dashboard(websocket: WebSocket, bot_id: int):
    await websocket.accept()
    try:
        async for message in log_and_status_generator(bot_id):
            await websocket.send_text(message)
    except WebSocketDisconnect:
        print(f"Client disconnected from bot {bot_id} dashboard")
