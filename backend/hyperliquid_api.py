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

    def get_vault_meta(self):
        return self.info.vault_meta()

    def vault_deposit(self, vault_address: str, amount: int):
        if not self.exchange:
            raise Exception("Exchange not initialized. Provide a private key.")
        return self.exchange.vault_transfer(vault_address, True, amount)

    def vault_withdraw(self, vault_address: str, amount: int):
        if not self.exchange:
            raise Exception("Exchange not initialized. Provide a private key.")
        return self.exchange.vault_transfer(vault_address, False, amount)

    def place_order(self, symbol: str, is_buy: bool, sz: float, limit_px: float, order_type: dict):
        if not self.exchange:
            raise Exception("Exchange not initialized. Provide a private key.")
        return self.exchange.order(symbol, is_buy, sz, limit_px, order_type)

    def cancel_order(self, symbol: str, oid: int):
        if not self.exchange:
            raise Exception("Exchange not initialized. Provide a private key.")
        return self.exchange.cancel(symbol, oid)

    def cancel_orders_batch(self, cancellations: list[dict]):
        if not self.exchange:
            raise Exception("Exchange not initialized. Provide a private key.")
        return self.exchange.cancel_batch(cancellations)

    def get_open_orders(self, user_address: str):
        return self.info.frontend_open_orders(user_address)

    def get_positions(self, user_address: str):
        user_state = self.info.user_state(user_address)
        return user_state.get("assetPositions", [])

    def get_user_vault_equity(self, user_address: str):
        return self.info.user_vault_equities(user_address)

    def get_vault_details(self, vault_address: str):
        # The SDK's info.vault_details method requires a user address.
        # We can pass the zero address for public vault data.
        return self.info.vault_details(user=constants.ZERO_ADDRESS, vault_address=vault_address)

    def get_validators(self):
        return self.info.validators()

    async def subscribe_to_user_events(self, user_address: str, callback):
        from hyperliquid.websocket import WebsocketManager

        ws_manager = WebsocketManager(constants.MAINNET_API_URL)

        subscription = {
            "type": "subscribe",
            "subscription": {
                "type": "userEvents",
                "user": user_address,
            },
        }

        await ws_manager.add_subscription(subscription, callback)

    def get_historical_orders(self, user_address: str):
        return self.info.historical_orders(user_address)

    def get_user_fills(self, user_address: str):
        return self.info.user_fills(user_address)
