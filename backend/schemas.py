from pydantic import BaseModel
from typing import Optional

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

class WalletImport(WalletBase):
    private_key: str

class WalletExport(WalletBase):
    id: int
    owner_id: int

class Wallet(WalletBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

class OrderRequest(BaseModel):
    wallet_id: int
    symbol: str
    is_buy: bool
    sz: float
    limit_px: float
    order_type: dict
    cloid: Optional[str] = None


class ModifyOrderRequest(BaseModel):
    wallet_id: int
    symbol: str
    sz: float
    limit_px: float
    order_type: dict
    cloid: Optional[str] = None


class SpotOrderRequest(BaseModel):
    wallet_id: int
    symbol: str
    is_buy: bool
    sz: float
    limit_px: float
    order_type: dict
    cloid: Optional[str] = None


class CancelOrderRequest(BaseModel):
    wallet_address: str
    symbol: str
    oid: int


class CancelOrdersBatchRequest(BaseModel):
    wallet_id: int
    cancellations: list[dict]


class BotRunRequest(BaseModel):
    wallet_id: int
    capital_allocation: float
    runtime_inputs: dict


class VaultDepositRequest(BaseModel):
    wallet_id: int
    vault_address: str
    amount: int


class VaultWithdrawRequest(BaseModel):
    wallet_id: int
    vault_address: str
    amount: int


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
