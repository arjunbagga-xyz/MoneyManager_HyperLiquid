from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
from . import models, schemas
from .security import get_password_hash
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


def create_wallet(db: Session, wallet: schemas.WalletCreate, user_id: int):
    encrypted_private_key = f.encrypt(wallet.private_key.encode()).decode()
    db_wallet = models.Wallet(
        name=wallet.name,
        address=wallet.address,
        private_key=encrypted_private_key,
        owner_id=user_id,
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    db_wallet.private_key = wallet.private_key
    return db_wallet
