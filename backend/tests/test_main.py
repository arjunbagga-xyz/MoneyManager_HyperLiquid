import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..main import app, get_db, get_hl_api
from ..database import Base
from ..config import settings
from ..hyperliquid_api import HyperliquidAPI
from unittest.mock import MagicMock
import os

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # Use a static pool for in-memory DB
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Override the get_db dependency to use the test database
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def db_session():
    """
    Fixture to create and tear down the database for each test function.
    """
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    Fixture to provide a test client.
    """
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
    # First, create a user to log in with
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
    """
    Fixture to provide an authenticated test client.
    """
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
    # Create a wallet
    create_response = authenticated_client.post(
        "/wallets/",
        json={"name": "test_wallet", "address": "test_address", "private_key": "test_key"},
    )
    assert create_response.status_code == 200, create_response.text
    create_data = create_response.json()
    assert create_data["name"] == "test_wallet"
    assert create_data["address"] == "test_address"
    assert "id" in create_data

    # Read the wallets and verify the created wallet is present and its key is correctly decrypted
    read_response = authenticated_client.get("/wallets/")
    assert read_response.status_code == 200, read_response.text
    read_data = read_response.json()
    assert isinstance(read_data, list)
    assert len(read_data) == 1
    assert read_data[0]["name"] == "test_wallet"
    # The private key should be decrypted and returned
    assert "private_key" not in read_data[0] # private_key is not in the Wallet schema for reading


def test_create_and_read_bot(authenticated_client):
    # Create a bot
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

    # Read the bots and verify the created bot is present
    read_response = authenticated_client.get("/bots/")
    assert read_response.status_code == 200, read_response.text
    read_data = read_response.json()
    assert isinstance(read_data, list)
    assert len(read_data) == 1
    assert read_data[0]["name"] == "test_bot"


def test_place_order(authenticated_client, db_session):
    # Mock the HyperliquidAPI
    mock_hl_api = MagicMock(spec=HyperliquidAPI)
    mock_hl_api.info = MagicMock()
    mock_hl_api.info.base_url = "https://api.hyperliquid-testnet.xyz"
    def get_mock_hl_api():
        return mock_hl_api
    app.dependency_overrides[get_hl_api] = get_mock_hl_api

    # Create a wallet to place an order with
    wallet_response = authenticated_client.post(
        "/wallets/",
        json={"name": "trading_wallet", "address": "trading_address", "private_key": "0x4929aa0dad4277f6a1a0a7f940d2ace1a503a5fcc90ac9d092c9c9a5939331cf"},
    )
    wallet_id = wallet_response.json()["id"]

    # Place an order
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

    # Verify that the place_order method was called
    mock_hl_api.place_order.assert_called_once()

    # Reset the dependency override
    app.dependency_overrides = {}
