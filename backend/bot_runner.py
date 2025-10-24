import multiprocessing
import sys
import json
import threading
import asyncio
import websockets
import os
import time
from .hyperliquid_api import HyperliquidAPI
from hyperliquid.exchange import Exchange
from hyperliquid.utils import constants
from eth_account import Account

class CapitalManager:
    def __init__(self, initial_capital):
        self.available_capital = initial_capital
        self.positions = {}

    def track_fill(self, symbol, is_buy, size, price):
        if is_buy:
            self.available_capital -= size * price
        else:
            self.available_capital += size * price

        if symbol not in self.positions:
            self.positions[symbol] = 0
        self.positions[symbol] += size if is_buy else -size


class WebSocketListener:
    def __init__(self, user_address, capital_manager):
        self.user_address = user_address
        self.capital_manager = capital_manager
        self.ws_url = "ws" + constants.MAINNET_API_URL[len("http"):] + "/ws"

    async def listen(self):
        async with websockets.connect(self.ws_url) as ws:
            await ws.send(json.dumps({"method": "subscribe", "subscription": {"type": "fills", "user": self.user_address}}))
            while True:
                message = await ws.recv()
                data = json.loads(message)
                if data.get("channel") == "fills":
                    for fill in data.get("data", []):
                        self.capital_manager.track_fill(fill['coin'], fill['side'] == 'B', float(fill['sz']), float(fill['px']))

    def run(self):
        asyncio.run(self.listen())


class BotTradingAPI:
    def __init__(self, private_key, capital_manager):
        self.api = HyperliquidAPI(private_key=private_key)
        self.capital_manager = capital_manager

    def place_order(self, symbol: str, is_buy: bool, sz: float, limit_px: float, order_type: dict):
        order_value = sz * limit_px
        if self.capital_manager.available_capital < order_value and is_buy:
            raise Exception(f"Order value ({order_value}) exceeds available capital ({self.capital_manager.available_capital}).")

        return self.api.place_order(symbol, is_buy, sz, limit_px, order_type)

    def get_open_orders(self, user_address: str):
        return self.api.get_open_orders(user_address)

    def get_positions(self, user_address: str):
        return self.api.get_positions(user_address)


def dump_status(capital_manager, status_file):
    while True:
        status = {
            "timestamp": time.time(),
            "available_capital": capital_manager.available_capital,
            "positions": capital_manager.positions
        }
        with open(status_file, 'w') as f_status:
            json.dump(status, f_status)
        time.sleep(5)

def run_bot_process(bot_id: int, bot_code: str, runtime_inputs: dict, wallet_private_key: str, capital_allocation: float):
    log_dir = "bot_logs"
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"bot_{bot_id}.log")

    status_dir = "bot_status"
    os.makedirs(status_dir, exist_ok=True)
    status_file = os.path.join(status_dir, f"bot_{bot_id}.json")


    with open(log_file, "w") as f:
        sys.stdout = f
        sys.stderr = f
        try:
            account = Account.from_key(wallet_private_key)
            capital_manager = CapitalManager(capital_allocation)

            # Start the WebSocket listener in a separate thread
            ws_listener = WebSocketListener(account.address, capital_manager)
            ws_thread = threading.Thread(target=ws_listener.run, daemon=True)
            ws_thread.start()

            # Start the status dumper thread
            status_thread = threading.Thread(target=dump_status, args=(capital_manager, status_file), daemon=True)
            status_thread.start()

            trading_api = BotTradingAPI(wallet_private_key, capital_manager)

            bot_globals = {
                "runtime_inputs": runtime_inputs,
                "trading_api": trading_api,
                "print": print,
            }

            exec(bot_code, bot_globals)

        except Exception as e:
            print(f"Error executing bot: {e}")


class BotRunner:
    def __init__(self):
        self.active_bots = {}

    def start_bot(self, bot_id: int, bot_code: str, runtime_inputs: dict, wallet_private_key: str, capital_allocation: float):
        if bot_id in self.active_bots:
            return {"status": "error", "message": "Bot is already running"}

        process = multiprocessing.Process(
            target=run_bot_process,
            args=(bot_id, bot_code, runtime_inputs, wallet_private_key, capital_allocation)
        )
        process.start()

        self.active_bots[bot_id] = process

        return {"status": "success", "message": f"Bot {bot_id} started with PID {process.pid}"}

    def stop_bot(self, bot_id: int):
        if bot_id not in self.active_bots:
            return {"status": "error", "message": "Bot is not running"}

        process = self.active_bots[bot_id]
        process.terminate()
        process.join()

        del self.active_bots[bot_id]

        return {"status": "success", "message": f"Bot {bot_id} stopped"}

bot_runner = BotRunner()
