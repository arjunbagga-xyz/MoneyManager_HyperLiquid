from pydantic import BaseModel
from typing import List, Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

class WalletBase(BaseModel):
    name: str
    address: str

class WalletCreate(WalletBase):
    private_key: str

class Wallet(WalletBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

class OrderRequest(BaseModel):
    symbol: str
    is_buy: bool
    sz: float
    limit_px: float
    order_type: dict


class WalletWithKey(Wallet):
    private_key: str


class BotBase(BaseModel):
    name: str
    code: str
    input_schema: Optional[dict] = None

class BotCreate(BotBase):
    pass

class Bot(BotBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True
