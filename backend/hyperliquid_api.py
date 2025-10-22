from hyperliquid.info import Info
from hyperliquid.utils import constants

class HyperliquidAPI:
    def __init__(self, is_mainnet=True):
        self.info = Info(constants.MAINNET_API_URL if is_mainnet else constants.TESTNET_API_URL)

    def get_user_state(self, user_address: str):
        """
        Retrieves the state of a user, including their assets and positions.
        """
        return self.info.user_state(user_address)

    def get_all_mids(self):
        """
        Retrieves the mid-market price for all assets.
        """
        return self.info.all_mids()

    def get_meta(self):
        """
        Retrieves metadata about the available assets.
        """
        return self.info.meta()
