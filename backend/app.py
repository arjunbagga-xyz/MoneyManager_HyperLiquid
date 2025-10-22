from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from . import crud, models, schemas, security
from .database import SessionLocal, engine
from .config import settings
from .hyperliquid_api import HyperliquidAPI
from .bot_runner import bot_runner
from hyperliquid.exchange import Exchange
from eth_account import Account

def create_app():
    app = FastAPI()

    @app.on_event("startup")
    def on_startup():
        models.Base.metadata.create_all(bind=engine)

    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def get_hl_api():
        return HyperliquidAPI()

    async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = schemas.TokenData(username=username)
        except JWTError:
            raise credentials_exception
        user = crud.get_user(db, username=token_data.username)
        if user is None:
            raise credentials_exception
        return user

    @app.post("/token", response_model=schemas.Token)
    async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
        user = crud.get_user(db, username=form_data.username)
        if not user or not security.verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = security.create_access_token(
            data={"sub": user.username}
        )
        return {"access_token": access_token, "token_type": "bearer"}

    @app.post("/users/", response_model=schemas.User)
    def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
        db_user = crud.get_user(db, username=user.username)
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")
        return crud.create_user(db=db, user=user)

    @app.get("/users/me/", response_model=schemas.User)
    async def read_users_me(current_user: schemas.User = Depends(get_current_user)):
        return current_user

    @app.post("/wallets/", response_model=schemas.Wallet)
    def create_wallet(
        wallet: schemas.WalletCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)
    ):
        return crud.create_wallet(db=db, wallet=wallet, user_id=current_user.id)

    @app.get("/wallets/", response_model=list[schemas.Wallet])
    def read_wallets(
        skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)
    ):
        wallets = crud.get_wallets(db, user_id=current_user.id, skip=skip, limit=limit)
        return wallets

    @app.get("/hyperliquid/meta")
    def get_hyperliquid_meta(hl_api: HyperliquidAPI = Depends(get_hl_api)):
        return hl_api.get_meta()

    @app.get("/wallets/{wallet_address}/balance")
    def get_wallet_balance(wallet_address: str, hl_api: HyperliquidAPI = Depends(get_hl_api)):
        try:
            user_state = hl_api.get_user_state(wallet_address)
            balance = user_state.get("marginSummary", {}).get("accountValue", "0")
            return {"balance": balance}
        except Exception as e:
            return {"balance": "0"}

    @app.post("/bots/", response_model=schemas.Bot)
    def create_bot(
        bot: schemas.BotCreate, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)
    ):
        return crud.create_bot(db=db, bot=bot, user_id=current_user.id)

    @app.get("/bots/", response_model=list[schemas.Bot])
    def read_bots(
        skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)
    ):
        bots = crud.get_bots(db, user_id=current_user.id, skip=skip, limit=limit)
        return bots

    @app.post("/wallets/{wallet_id}/order")
    def place_order(
        wallet_id: int, order: schemas.OrderRequest, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user), hl_api: HyperliquidAPI = Depends(get_hl_api)
    ):
        wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        hl_api.exchange = Exchange(Account.from_key(wallet.private_key), hl_api.info.base_url)
        return hl_api.place_order(
            symbol=order.symbol,
            is_buy=order.is_buy,
            sz=order.sz,
            limit_px=order.limit_px,
            order_type=order.order_type,
        )

    @app.get("/wallets/{wallet_id}/open-orders")
    def get_open_orders(
        wallet_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user), hl_api: HyperliquidAPI = Depends(get_hl_api)
    ):
        wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        hl_api.exchange = Exchange(Account.from_key(wallet.private_key), hl_api.info.base_url)
        return hl_api.get_open_orders(user_address=wallet.address)

    @app.get("/wallets/{wallet_id}/positions")
    def get_positions(
        wallet_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user), hl_api: HyperliquidAPI = Depends(get_hl_api)
    ):
        wallet = crud.get_wallet(db, wallet_id=wallet_id, user_id=current_user.id)
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")

        hl_api.exchange = Exchange(Account.from_key(wallet.private_key), hl_api.info.base_url)
        return hl_api.get_positions(user_address=wallet.address)

    @app.post("/bots/{bot_id}/run")
    def run_bot(
        bot_id: int, run_request: schemas.BotRunRequest, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)
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

    @app.post("/bots/{bot_id}/stop")
    def stop_bot(
        bot_id: int, current_user: schemas.User = Depends(get_current_user)
    ):
        return bot_runner.stop_bot(bot_id=bot_id)

    @app.get("/bots/{bot_id}/logs")
    def get_bot_logs(bot_id: int, current_user: schemas.User = Depends(get_current_user)):
        # In a real app, you would want to verify that the user owns the bot
        # before allowing them to view the logs.
        log_file = f"bot_logs/bot_{bot_id}.log"
        try:
            with open(log_file, "r") as f:
                return f.read()
        except FileNotFoundError:
            return "No logs found for this bot."

    @app.get("/")
    def read_root():
        return {"Hello": "World"}

    return app
