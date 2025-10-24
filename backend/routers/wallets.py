from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..hyperliquid_api import HyperliquidAPI
from .. import security

router = APIRouter()

@router.post("/", response_model=schemas.Wallet)
def create_wallet(
    wallet: schemas.WalletCreate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    return crud.create_wallet(db=db, wallet=wallet, user_id=current_user.id)

@router.get("/", response_model=list[schemas.Wallet])
def read_wallets(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallets = crud.get_wallets(db, user_id=current_user.id, skip=skip, limit=limit)
    return wallets

@router.get("/{wallet_address}/balance")
def get_wallet_balance(wallet_address: str, hl_api: HyperliquidAPI = Depends(HyperliquidAPI)):
    try:
        user_state = hl_api.get_user_state(wallet_address)
        balance = user_state.get("marginSummary", {}).get("accountValue", "0")
        return {"balance": balance}
    except Exception as e:
        return {"balance": "0"}

@router.get("/{wallet_id}/open-orders")
def get_open_orders(
    wallet_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.get_open_orders(user_address=wallet.address)

@router.get("/{wallet_id}/positions")
def get_positions(
    wallet_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.get_positions(user_address=wallet.address)

@router.get("/{wallet_address}/vault-equity")
def get_vault_equity(
    wallet_address: str, hl_api: HyperliquidAPI = Depends(HyperliquidAPI), current_user: models.User = Depends(security.get_current_user)
):
    # We don't need to check the wallet ownership here, as the API call is read-only
    # and doesn't require a private key. We just need to make sure the user is authenticated.
    return hl_api.get_user_vault_equity(user_address=wallet_address)

@router.get("/{wallet_id}/state")
def get_wallet_state(
    wallet_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    open_orders = hl_api.get_open_orders(user_address=wallet.address)
    positions = hl_api.get_positions(user_address=wallet.address)
    spot_balances = hl_api.get_spot_balances(user_address=wallet.address)

    return {"open_orders": open_orders, "positions": positions, "spot_balances": spot_balances}

@router.get("/{wallet_id}/order-history")
def get_order_history(
    wallet_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.get_historical_orders(user_address=wallet.address)

@router.get("/{wallet_id}/trade-history")
def get_trade_history(
    wallet_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.get_user_fills(user_address=wallet.address)

@router.get("/{wallet_id}/portfolio-history")
def get_portfolio_history(
    wallet_id: int, start_time: int, end_time: int, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.get_historical_portfolio_value(user_address=wallet.address, start_time=start_time, end_time=end_time)
