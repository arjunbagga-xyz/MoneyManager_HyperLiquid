import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..app import create_app
from ..database import Base
from ..config import settings
from ..hyperliquid_api import HyperliquidAPI
from unittest.mock import MagicMock, patch

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def app():
    app = create_app()
    app.dependency_overrides[app.dependency_overrides.get('get_db', get_db)] = override_get_db
    yield app
    app.dependency_overrides = {}


@pytest.fixture(scope="function")
def db_session(app):
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(app, db_session):
    yield TestClient(app)


def test_create_user(client):
    response = client.post(
        "/users/",
        json={"username": "testuser", "password": "testpassword"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["username"] == "testuser"
    assert "id" in data


def test_login_for_access_token(client):
    client.post("/users/", json={"username": "testuser", "password": "testpassword"})
    response = client.post(
        "/token",
        data={"username": "testuser", "password": "testpassword"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.fixture(scope="function")
def authenticated_client(client):
    client.post("/users/", json={"username": "testuser", "password": "testpassword"})
    response = client.post(
        "/token",
        data={"username": "testuser", "password": "testpassword"},
    )
    token = response.json()["access_token"]
    client.headers = {"Authorization": f"Bearer {token}"}
    return client


def test_read_users_me(authenticated_client):
    response = authenticated_client.get("/users/me/")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["username"] == "testuser"


def test_create_and_read_wallet(authenticated_client):
    create_response = authenticated_client.post(
        "/wallets/",
        json={"name": "test_wallet", "address": "test_address", "private_key": "test_key"},
    )
    assert create_response.status_code == 200, create_response.text
    create_data = create_response.json()
    assert create_data["name"] == "test_wallet"
    assert create_data["address"] == "test_address"
    assert "id" in create_data
    read_response = authenticated_client.get("/wallets/")
    assert read_response.status_code == 200, read_response.text
    read_data = read_response.json()
    assert isinstance(read_data, list)
    assert len(read_data) == 1
    assert read_data[0]["name"] == "test_wallet"
    assert "private_key" not in read_data[0]


def test_create_and_read_bot(authenticated_client):
    create_response = authenticated_client.post(
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
    read_response = authenticated_client.get("/bots/")
    assert read_response.status_code == 200, read_response.text
    read_data = read_response.json()
    assert isinstance(read_data, list)
    assert len(read_data) == 1
    assert read_data[0]["name"] == "test_bot"


@patch("backend.app.HyperliquidAPI")
def test_place_order(mock_hl_api_class, authenticated_client, db_session):
    mock_hl_api_instance = mock_hl_api_class.return_value
    wallet_response = authenticated_client.post(
        "/wallets/",
        json={"name": "trading_wallet", "address": "trading_address", "private_key": "0x4929aa0dad4277f6a1a0a7f940d2ace1a503a5fcc90ac9d092c9c9a5939331cf"},
    )
    wallet_id = wallet_response.json()["id"]
    order_response = authenticated_client.post(
        f"/wallets/{wallet_id}/order",
        json={
            "symbol": "BTC",
            "is_buy": True,
            "sz": 0.1,
            "limit_px": 50000,
            "order_type": {"limit": {"tif": "Gtc"}},
        },
    )
    assert order_response.status_code == 200, order_response.text
    mock_hl_api_instance.place_order.assert_called_once()


@patch("backend.app.bot_runner", new_callable=MagicMock)
def test_run_bot(mock_bot_runner, authenticated_client, db_session):
    wallet_response = authenticated_client.post(
        "/wallets/",
        json={"name": "bot_wallet", "address": "bot_address", "private_key": "0x4929aa0dad4277f6a1a0a7f940d2ace1a503a5fcc90ac9d092c9c9a5939331cf"},
    )
    wallet_id = wallet_response.json()["id"]
    bot_response = authenticated_client.post(
        "/bots/",
        json={"name": "test_bot", "code": "print('hello')", "input_schema": {}},
    )
    bot_id = bot_response.json()["id"]
    run_response = authenticated_client.post(
        f"/bots/{bot_id}/run",
        json={
            "wallet_id": wallet_id,
            "capital_allocation": 100.0,
            "runtime_inputs": {},
        },
    )
    assert run_response.status_code == 200, run_response.text
    mock_bot_runner.start_bot.assert_called_once()

# Helper function to get the real get_db dependency if it's not overridden
def get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
