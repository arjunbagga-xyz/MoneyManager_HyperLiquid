import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import MagicMock, patch

from backend.app import create_app
from backend.database import Base, get_db
from backend.hyperliquid_api import HyperliquidAPI
from backend.bot_runner import BotRunner

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture()
def client():
    app = create_app()
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


def test_create_user(client: TestClient):
    response = client.post(
        "/users/",
        json={"username": "testuser", "password": "testpassword"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["username"] == "testuser"
    assert "id" in data

def test_login_for_access_token(client: TestClient):
    client.post("/users/", json={"username": "testuser", "password": "testpassword"})
    response = client.post(
        "/users/token",
        data={"username": "testuser", "password": "testpassword"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def authenticated_client(client: TestClient) -> TestClient:
    client.post("/users/", json={"username": "testuser", "password": "testpassword"})
    response = client.post(
        "/users/token",
        data={"username": "testuser", "password": "testpassword"},
    )
    token = response.json()["access_token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

def test_read_users_me(client: TestClient):
    auth_client = authenticated_client(client)
    response = auth_client.get("/users/me/")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["username"] == "testuser"

def test_create_and_read_wallet(client: TestClient):
    auth_client = authenticated_client(client)
    create_response = auth_client.post(
        "/wallets/",
        json={"name": "test_wallet", "address": "test_address", "private_key": "test_key"},
    )
    assert create_response.status_code == 200, create_response.text
    create_data = create_response.json()
    assert create_data["name"] == "test_wallet"
    assert create_data["address"] == "test_address"
    assert "id" in create_data
    read_response = auth_client.get("/wallets/")
    assert read_response.status_code == 200, read_response.text
    read_data = read_response.json()
    assert isinstance(read_data, list)
    assert len(read_data) == 1
    assert read_data[0]["name"] == "test_wallet"
    assert "private_key" not in read_data[0]

def test_create_and_read_bot(client: TestClient):
    auth_client = authenticated_client(client)
    create_response = auth_client.post(
        "/bots/",
        json={
            "name": "test_bot",
            "code": "print('hello')",
            "input_schema": {"test": "test"}
        },
    )
    assert create_response.status_code == 200, create_response.text
    create_data = create_response.json()
    assert create_data["name"] == "test_bot"
    assert create_data["code"] == "print('hello')"
    assert "id" in create_data
    read_response = auth_client.get("/bots/")
    assert read_response.status_code == 200, read_response.text
    read_data = read_response.json()
    assert isinstance(read_data, list)
    assert len(read_data) == 1
    assert read_data[0]["name"] == "test_bot"

def test_place_order(client: TestClient):
    with patch("backend.routers.trades.HyperliquidAPI") as mock_hl_api_class:
        auth_client = authenticated_client(client)
        mock_hl_api_instance = mock_hl_api_class.return_value
        wallet_response = auth_client.post(
            "/wallets/",
            json={"name": "trading_wallet", "address": "trading_address", "private_key": "0x4929aa0dad4277f6a1a0a7f940d2ace1a503a5fcc90ac9d092c9c9a5939331cf"},
        )
        wallet_id = wallet_response.json()["id"]
        order_response = auth_client.post(
            "/trades/",
            json={
                "wallet_id": wallet_id,
                "symbol": "BTC",
                "is_buy": True,
                "sz": 0.1,
                "limit_px": 50000,
                "order_type": {"limit": {"tif": "Gtc"}},
            },
        )
        assert order_response.status_code == 200, order_response.text
        assert mock_hl_api_instance.place_order.called

from backend.bot_runner import bot_runner

@patch.object(bot_runner, "start_bot")
def test_run_bot(mock_start_bot, client: TestClient):
    auth_client = authenticated_client(client)
    wallet_response = auth_client.post(
        "/wallets/",
        json={"name": "bot_wallet", "address": "bot_address", "private_key": "0x4929aa0dad4277f6a1a0a7f940d2ace1a503a5fcc90ac9d092c9c9a5939331cf"},
    )
    wallet_id = wallet_response.json()["id"]
    bot_response = auth_client.post(
        "/bots/",
        json={"name": "test_bot", "code": "print('hello')", "input_schema": {}},
    )
    bot_id = bot_response.json()["id"]
    run_response = auth_client.post(
        f"/bots/{bot_id}/run",
        json={
            "wallet_id": wallet_id,
            "capital_allocation": 100.0,
            "runtime_inputs": {},
        },
    )
    assert run_response.status_code == 200, run_response.text
    mock_start_bot.assert_called_once()

@patch.object(HyperliquidAPI, "get_vault_meta", return_value=[{"name": "Test Vault"}])
def test_get_vault_meta(mock_get_vault_meta, client: TestClient):
    auth_client = authenticated_client(client)
    response = auth_client.get("/vaults/meta")
    assert response.status_code == 200
    assert response.json() == [{"name": "Test Vault"}]
