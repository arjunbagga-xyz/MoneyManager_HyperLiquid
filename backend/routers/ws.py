from fastapi import APIRouter, WebSocket, Depends, WebSocketDisconnect
from ..hyperliquid_api import HyperliquidAPI
import asyncio

router = APIRouter()

@router.websocket("/ws/updates/{wallet_address}")
async def websocket_endpoint(websocket: WebSocket, wallet_address: str, hl_api: HyperliquidAPI = Depends(HyperliquidAPI)):
    await websocket.accept()

    async def callback(event):
        await websocket.send_json(event)

    try:
        await hl_api.subscribe_to_user_events(wallet_address, callback)
        # Keep the connection alive while subscribed
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        print(f"Client disconnected from wallet: {wallet_address}")
    except Exception as e:
        print(f"An error occurred in websocket for {wallet_address}: {e}")
        await websocket.close(code=1011)
