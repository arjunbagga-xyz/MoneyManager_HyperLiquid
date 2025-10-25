from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
from . import models, schemas
from .passwords import get_password_hash
from .config import settings

f = Fernet(settings.encryption_key.encode())


def get_user(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_wallets(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    wallets = db.query(models.Wallet).filter(models.Wallet.owner_id == user_id).offset(skip).limit(limit).all()
    for wallet in wallets:
        wallet.private_key = f.decrypt(wallet.private_key.encode()).decode()
    return wallets

def get_wallet_by_address(db: Session, wallet_address: str, user_id: int):
    wallet = db.query(models.Wallet).filter(models.Wallet.address == wallet_address, models.Wallet.owner_id == user_id).first()
    if wallet:
        wallet.private_key = f.decrypt(wallet.private_key.encode()).decode()
    return wallet


def get_wallet(db: Session, wallet_id: int, user_id: int):
    wallet = db.query(models.Wallet).filter(models.Wallet.id == wallet_id, models.Wallet.owner_id == user_id).first()
    if wallet:
        wallet.private_key = f.decrypt(wallet.private_key.encode()).decode()
    return wallet


from eth_account import Account

def create_wallet(db: Session, name: str, user_id: int):
    account = Account.create()
    private_key = account.key.hex()
    address = account.address

    encrypted_private_key = f.encrypt(private_key.encode()).decode()
    db_wallet = models.Wallet(
        name=name,
        address=address,
        private_key=encrypted_private_key,
        owner_id=user_id,
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    db_wallet.private_key = private_key # Return the unencrypted key for immediate use
    return db_wallet


def get_bots(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Bot).filter(models.Bot.owner_id == user_id).offset(skip).limit(limit).all()


def create_bot(db: Session, bot: schemas.BotCreate, user_id: int):
    db_bot = models.Bot(**bot.dict(), owner_id=user_id)
    db.add(db_bot)
    db.commit()
    db.refresh(db_bot)
    return db_bot


def get_bot(db: Session, bot_id: int, user_id: int):
    return db.query(models.Bot).filter(models.Bot.id == bot_id, models.Bot.owner_id == user_id).first()


def update_bot(db: Session, bot_id: int, bot_update: schemas.BotUpdate, user_id: int):
    db_bot = get_bot(db, bot_id=bot_id, user_id=user_id)
    if not db_bot:
        return None

    update_data = bot_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_bot, key, value)

    db.add(db_bot)
    db.commit()
    db.refresh(db_bot)
    return db_bot
