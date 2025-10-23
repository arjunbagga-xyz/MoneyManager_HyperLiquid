from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas, security
from ..database import get_db
from ..hyperliquid_api import HyperliquidAPI

router = APIRouter()

@router.get("/validators")
def get_validators(hl_api: HyperliquidAPI = Depends(HyperliquidAPI)):
    return hl_api.get_validators()

@router.post("/delegate")
def delegate(
    delegate_request: schemas.DelegateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=delegate_request.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.delegate_to_validator(validator_address=delegate_request.validator_address, amount=delegate_request.amount)

@router.post("/undelegate")
def undelegate(
    undelegate_request: schemas.UndelegateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    wallet = crud.get_wallet(db, wallet_id=undelegate_request.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    hl_api = HyperliquidAPI(private_key=wallet.private_key)
    return hl_api.undelegate_from_validator(validator_address=undelegate_request.validator_address, amount=undelegate_request.amount)
