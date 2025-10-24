from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from .database import Base, engine
from .routers import users, wallets, bots, trades, vaults, ws, market

def create_app():
    app = FastAPI()

    @app.on_event("startup")
    def on_startup():
        Base.metadata.create_all(bind=engine)

    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(wallets.router, prefix="/wallets", tags=["wallets"])
    app.include_router(bots.router, prefix="/bots", tags=["bots"])
    app.include_router(trades.router, prefix="/trades", tags=["trades"])
    app.include_router(vaults.router, prefix="/vaults", tags=["vaults"])
    app.include_router(ws.router, tags=["websockets"])
    app.include_router(market.router, prefix="/market", tags=["market"])

    @app.get("/")
    def read_root():
        return {"Hello": "World"}

    app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

    return app
