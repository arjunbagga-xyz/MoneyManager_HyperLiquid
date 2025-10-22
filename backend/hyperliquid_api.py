from hyperliquid.info import Info
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants
from .exchange_interface import ExchangeInterface
from eth_account import Account

class HyperliquidAPI(ExchangeInterface):
    def __init__(self, private_key=None, is_mainnet=True):
        self.info = Info(constants.MAINNET_API_URL if is_mainnet else constants.TESTNET_API_URL)
        if private_key:
            account = Account.from_key(private_key)
            self.exchange = Exchange(account, constants.MAINNET_API_URL if is_mainnet else constants.TESTNET_API_URL)
        else:
            self.exchange = None

    def get_user_state(self, user_address: str):
        return self.info.user_state(user_address)

    def get_all_mids(self):
        return self.info.all_mids()

    def get_meta(self):
        return self.info.meta()

    def place_order(self, symbol: str, is_buy: bool, sz: float, limit_px: float, order_type: dict):
        if not self.exchange:
            raise Exception("Exchange not initialized. Provide a private key.")
        return self.exchange.order(symbol, is_buy, sz, limit_px, order_type)

    def get_open_orders(self, user_address: str):
        return self.info.open_orders(user_address)

    def get_positions(self, user_address: str):
        user_state = self.info.user_state(user_address)
        return user_state.get("assetPositions", [])
