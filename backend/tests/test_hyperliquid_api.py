import pytest
from unittest.mock import MagicMock, patch
from backend.hyperliquid_api import HyperliquidAPI

@pytest.fixture
def hl_api():
    with patch("hyperliquid.info.Info") as mock_info, patch("hyperliquid.exchange.Exchange") as mock_exchange:
        api = HyperliquidAPI(private_key="0x4929aa0dad4277f6a1a0a7f940d2ace1a503a5fcc90ac9d092c9c9a5939331cf")
        api.info = mock_info.return_value
        api.exchange = mock_exchange.return_value
        return api

def test_get_validators(hl_api: HyperliquidAPI):
    hl_api.info.meta.return_value = {"universe": [{"name": "BTC"}, {"name": "ETH"}]}
    validators = hl_api.get_validators()
    assert isinstance(validators, list)
    assert hl_api.info.meta.called

def test_delegate_to_validator(hl_api: HyperliquidAPI):
    response = hl_api.delegate_to_validator("0xValidator", 100)
    hl_api.exchange.token_delegate.assert_called_with("0xValidator", False, 100)

def test_undelegate_from_validator(hl_api: HyperliquidAPI):
    response = hl_api.undelegate_from_validator("0xValidator", 50)
    hl_api.exchange.token_delegate.assert_called_with("0xValidator", True, 50)

def test_get_vault_meta(hl_api: HyperliquidAPI):
    hl_api.info.vault_meta.return_value = [{"name": "Test Vault"}]
    vault_meta = hl_api.get_vault_meta()
    assert vault_meta == [{"name": "Test Vault"}]
    assert hl_api.info.vault_meta.called

def test_vault_deposit(hl_api: HyperliquidAPI):
    response = hl_api.vault_deposit("0xVault", 1000)
    hl_api.exchange.vault_transfer.assert_called_with("0xVault", True, 1000)

def test_place_order(hl_api: HyperliquidAPI):
    hl_api.place_order(
        symbol="BTC",
        is_buy=True,
        sz=0.1,
        limit_px=50000,
        order_type={"limit": {"tif": "Gtc"}},
    )
    hl_api.exchange.order.assert_called_once()
