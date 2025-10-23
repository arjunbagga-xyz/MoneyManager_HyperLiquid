from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..hyperliquid_api import HyperliquidAPI
from .. import security

router = APIRouter()

@router.post("/")
def place_order(
    order: schemas.OrderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=order.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.place_order(
        symbol=order.symbol,
        is_buy=order.is_buy,
        sz=order.sz,
        limit_px=order.limit_px,
        order_type=order.order_type,
    )
