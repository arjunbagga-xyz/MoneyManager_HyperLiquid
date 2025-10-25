from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..hyperliquid_api import HyperliquidAPI
from .. import security

router = APIRouter()

@router.post("/")
def place_order(
    order: schemas.OrderRequestByAddress, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet_by_address(db, wallet_address=order.wallet_address, user_id=current_user.id)
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

@router.put("/{order_id}")
def modify_order(
    order_id: int, order: schemas.ModifyOrderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=order.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.modify_order(
        symbol=order.symbol,
        oid=order_id,
        sz=order.sz,
        limit_px=order.limit_px,
        order_type=order.order_type,
    )

@router.delete("/cancel")
def cancel_order(
    cancel_request: schemas.CancelOrderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    # We need to find the wallet in the DB to get the private key for signing
    wallet = db.query(models.Wallet).filter(models.Wallet.address == cancel_request.wallet_address, models.Wallet.owner_id == current_user.id).first()
    if not wallet:
        # We need to check if this is a subaccount of a managed wallet
        # This logic can be complex, for now, we assume only master accounts can cancel
        raise HTTPException(status_code=404, detail="Wallet not found or you are not the owner")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.cancel_order(symbol=cancel_request.symbol, oid=cancel_request.oid)

@router.delete("/cancel-all/{wallet_address}")
def cancel_all_orders(
    wallet_address: str, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = db.query(models.Wallet).filter(models.Wallet.address == wallet_address, models.Wallet.owner_id == current_user.id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found or you are not the owner")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    open_orders = hl_api.get_open_orders(user_address=wallet.address)

    if not open_orders:
        return {"status": "success", "message": "No open orders to cancel."}

    cancellations = [
        {"coin": order["order"]["coin"], "oid": order["order"]["oid"]} for order in open_orders
    ]

    return hl_api.cancel_orders_batch(cancellations)

@router.post("/spot")
def place_spot_order(
    order: schemas.SpotOrderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=order.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.place_spot_order(
        symbol=order.symbol,
        is_buy=order.is_buy,
        sz=order.sz,
        limit_px=order.limit_px,
        order_type=order.order_type,
    )
