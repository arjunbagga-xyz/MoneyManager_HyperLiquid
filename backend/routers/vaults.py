from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas, security
from ..database import get_db
from ..hyperliquid_api import HyperliquidAPI

router = APIRouter()

@router.get("/meta")
def get_vault_meta(hl_api: HyperliquidAPI = Depends(HyperliquidAPI)):
    return hl_api.get_vault_meta()

@router.post("/deposit")
def vault_deposit(
    deposit_request: schemas.VaultDepositRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=deposit_request.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.vault_deposit(vault_address=deposit_request.vault_address, amount=deposit_request.amount)

@router.post("/withdraw")
def vault_withdraw(
    withdraw_request: schemas.VaultWithdrawRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=withdraw_request.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.vault_withdraw(vault_address=withdraw_request.vault_address, amount=withdraw_request.amount)

@router.get("/{vault_address}/details")
def get_vault_details(
    vault_address: str, hl_api: HyperliquidAPI = Depends(HyperliquidAPI), current_user: models.User = Depends(security.get_current_user)
):
    return hl_api.get_vault_details(vault_address=vault_address)
