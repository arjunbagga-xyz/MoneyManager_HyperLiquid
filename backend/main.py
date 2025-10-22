from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from . import crud, models, schemas, security
from .database import SessionLocal, engine
from .config import settings
from .hyperliquid_api import HyperliquidAPI

app = FastAPI()

@app.on_event("startup")
def on_startup():
    models.Base.metadata.create_all(bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Dependency
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
        # The user_state contains a 'marginSummary' dict with the 'accountValue'.
        balance = user_state.get("marginSummary", {}).get("accountValue", "0")
        return {"balance": balance}
    except Exception as e:
        # If the address is not found on Hyperliquid, the API might error.
        # We'll return a zero balance in that case.
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


@app.get("/")
def read_root():
    return {"Hello": "World"}
