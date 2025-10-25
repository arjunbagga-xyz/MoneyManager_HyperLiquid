from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, models, schemas
from ..database import get_db
from ..bot_runner import bot_runner
from .. import security

router = APIRouter()

@router.post("/", response_model=schemas.Bot)
def create_bot(
    bot: schemas.BotCreate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    return crud.create_bot(db=db, bot=bot, user_id=current_user.id)

@router.get("/", response_model=list[schemas.Bot])
def read_bots(
    skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    bots = crud.get_bots(db, user_id=current_user.id, skip=skip, limit=limit)
    return bots

@router.put("/{bot_id}", response_model=schemas.Bot)
def update_bot(
    bot_id: int, bot_update: schemas.BotUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    updated_bot = crud.update_bot(db=db, bot_id=bot_id, bot_update=bot_update, user_id=current_user.id)
    if not updated_bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return updated_bot

@router.post("/{bot_id}/run")
def run_bot(
    bot_id: int, run_request: schemas.BotRunRequest, db: Session = Depends(get_db), current_user: models.User = Depends(security.get_current_user)
):
    bot = crud.get_bot(db, bot_id=bot_id, user_id=current_user.id)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    wallet = crud.get_wallet(db, wallet_id=run_request.wallet_id, user_id=current_user.id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    return bot_runner.start_bot(
        bot_id=bot.id,
        bot_code=bot.code,
        runtime_inputs=run_request.runtime_inputs,
        wallet_private_key=wallet.private_key,
        capital_allocation=run_request.capital_allocation,
    )

@router.post("/{bot_id}/stop")
def stop_bot(
    bot_id: int, current_user: models.User = Depends(security.get_current_user)
):
    return bot_runner.stop_bot(bot_id=bot_id)

@router.get("/{bot_id}/logs")
def get_bot_logs(bot_id: int, current_user: models.User = Depends(security.get_current_user)):
    log_file = f"bot_logs/bot_{bot_id}.log"
    try:
        with open(log_file, "r") as f:
            return f.read()
    except FileNotFoundError:
        return "No logs found for this bot."
