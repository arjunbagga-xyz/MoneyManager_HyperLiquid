from pydantic_settings import BaseSettings

from typing import Optional

class Settings(BaseSettings):
    database_url: str
    sqlalchemy_database_url: Optional[str] = None
    secret_key: str
    encryption_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    class Config:
        env_file = ".env"

settings = Settings(_env_file='backend/.env')
