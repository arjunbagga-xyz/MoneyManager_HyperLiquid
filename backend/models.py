from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Float, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    wallets = relationship("Wallet", back_populates="owner")
    bots = relationship("Bot", back_populates="owner")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    address = Column(String, unique=True, index=True)
    private_key = Column(String)  # This will be encrypted
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="wallets")
    trades = relationship("Trade", back_populates="wallet")


class Bot(Base):
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(Text)
    input_schema = Column(JSON)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="bots")
    trades = relationship("Trade", back_populates="bot")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    side = Column(String)
    price = Column(Float)
    quantity = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String, default="manual", index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    bot_id = Column(Integer, ForeignKey("bots.id"), nullable=True)

    wallet = relationship("Wallet", back_populates="trades")
    bot = relationship("Bot", back_populates="trades")
