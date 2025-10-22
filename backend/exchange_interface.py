from abc import ABC, abstractmethod

class ExchangeInterface(ABC):
    @abstractmethod
    def get_user_state(self, user_address: str):
        pass

    @abstractmethod
    def get_all_mids(self):
        pass

    @abstractmethod
    def get_meta(self):
        pass

    @abstractmethod
    def place_order(self, user_address: str, symbol: str, side: str, size: float, price: float, order_type: str):
        pass

    @abstractmethod
    def get_open_orders(self, user_address: str):
        pass

    @abstractmethod
    def get_positions(self, user_address: str):
        pass
