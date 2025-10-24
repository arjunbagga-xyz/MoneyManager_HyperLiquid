
from fastapi import APIRouter, Depends
from ..hyperliquid_api import HyperliquidAPI

router = APIRouter()

@router.get("/funding-history")
def get_funding_history(symbol: str, start_time: int, end_time: int, hl_api: HyperliquidAPI = Depends(HyperliquidAPI)):
    return hl_api.get_funding_history(symbol=symbol, start_time=start_time, end_time=end_time)

@router.get("/candles")
def get_candles(symbol: str, interval: str, start_time: int, end_time: int, hl_api: HyperliquidAPI = Depends(HyperliquidAPI)):
    return hl_api.get_candles(symbol=symbol, interval=interval, start_time=start_time, end_time=end_time)
