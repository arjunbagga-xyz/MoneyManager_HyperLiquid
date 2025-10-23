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
TEST_PRIVATE_KEY = "0x614a74a078d1b7fbf5e1584513b3f1fceb7b08a402b3571cdd7975552d81343a"

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

@pytest.fixture
def mock_hl_api():
    mock = MagicMock(spec=HyperliquidAPI)
    mock.get_validators.return_value = [{"name": "Test Validator"}]
    mock.get_vault_meta.return_value = [{"name": "Test Vault"}]
    return mock

@pytest.fixture()
def client(mock_hl_api: MagicMock):
    app = create_app()
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[HyperliquidAPI] = lambda: mock_hl_api
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
        json={"name": "test_wallet", "address": "test_address", "private_key": TEST_PRIVATE_KEY},
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

def test_place_order(client: TestClient, mock_hl_api: MagicMock):
    auth_client = authenticated_client(client)
    wallet_response = auth_client.post(
        "/wallets/",
        json={"name": "trading_wallet", "address": "trading_address", "private_key": TEST_PRIVATE_KEY},
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
    mock_hl_api.place_order.assert_called_once()


from backend.bot_runner import bot_runner

@patch.object(bot_runner, "start_bot")
def test_run_bot(mock_start_bot, client: TestClient):
    auth_client = authenticated_client(client)
    wallet_response = auth_client.post(
        "/wallets/",
        json={"name": "bot_wallet", "address": "bot_address", "private_key": TEST_PRIVATE_KEY},
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

def test_get_vault_meta(client: TestClient, mock_hl_api: MagicMock):
    auth_client = authenticated_client(client)
    response = auth_client.get("/vaults/meta")
    assert response.status_code == 200
    assert response.json() == [{"name": "Test Vault"}]
    mock_hl_api.get_vault_meta.assert_called_once()

def test_get_validators(client: TestClient, mock_hl_api: MagicMock):
    auth_client = authenticated_client(client)
    response = auth_client.get("/staking/validators")
    assert response.status_code == 200
    assert response.json() == [{"name": "Test Validator"}]
    mock_hl_api.get_validators.assert_called_once()

def test_create_user_duplicate_username(client: TestClient):
    client.post("/users/", json={"username": "testuser", "password": "testpassword"})
    response = client.post(
        "/users/",
        json={"username": "testuser", "password": "newpassword"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already registered"

def test_login_incorrect_password(client: TestClient):
    client.post("/users/", json={"username": "testuser", "password": "testpassword"})
    response = client.post(
        "/users/token",
        data={"username": "testuser", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

def test_unauthenticated_access(client: TestClient):
    response = client.get("/users/me/")
    assert response.status_code == 401

def test_delegate(client: TestClient, mock_hl_api: MagicMock):
    auth_client = authenticated_client(client)
    wallet_response = auth_client.post(
        "/wallets/",
        json={"name": "staking_wallet", "address": "staking_address", "private_key": TEST_PRIVATE_KEY},
    )
    wallet_id = wallet_response.json()["id"]
    response = auth_client.post(
        "/staking/delegate",
        json={"wallet_id": wallet_id, "validator_address": "0xValidator", "amount": 100},
    )
    assert response.status_code == 200
    mock_hl_api.delegate_to_validator.assert_called_with(
        validator_address="0xValidator", amount=100
    )

def test_undelegate(client: TestClient, mock_hl_api: MagicMock):
    auth_client = authenticated_client(client)
    wallet_response = auth_client.post(
        "/wallets/",
        json={"name": "staking_wallet", "address": "staking_address", "private_key": TEST_PRIVATE_KEY},
    )
    wallet_id = wallet_response.json()["id"]
    response = auth_client.post(
        "/staking/undelegate",
        json={"wallet_id": wallet_id, "validator_address": "0xValidator", "amount": 50},
    )
    assert response.status_code == 200
    mock_hl_api.undelegate_from_validator.assert_called_with(
        validator_address="0xValidator", amount=50
    )

def test_vault_deposit(client: TestClient, mock_hl_api: MagicMock):
    auth_client = authenticated_client(client)
    wallet_response = auth_client.post(
        "/wallets/",
        json={"name": "vault_wallet", "address": "vault_address", "private_key": TEST_PRIVATE_KEY},
    )
    wallet_id = wallet_response.json()["id"]
    response = auth_client.post(
        "/vaults/deposit",
        json={"wallet_id": wallet_id, "vault_address": "0xVault", "amount": 1000},
    )
    assert response.status_code == 200
    mock_hl_api.vault_deposit.assert_called_with(
        vault_address="0xVault", amount=1000
    )
