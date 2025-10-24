# Implementation Plan

This document outlines the plan for implementing the new features and improvements requested in the code audit review. The plan is broken down into phases, with each phase focusing on a specific area of the application.

## Phase 1: Vaults Page Enhancements

This phase focuses on completing the Vaults page functionality, which is currently incomplete.

1.  **Implement Withdrawals:**
    -   **Backend:**
        -   Add a `vault_withdraw` method to the `HyperliquidAPI` class in `backend/hyperliquid_api.py`. This method will call the `vault_transfer` method of the `hyperliquid-python-sdk` with `isDeposit=False`.
        -   Create a new endpoint `POST /vaults/withdraw` in `backend/routers/vaults.py` that takes a `VaultWithdrawRequest` schema.
        -   Add a `VaultWithdrawRequest` schema to `backend/schemas.py`.
    -   **Frontend:**
        -   In `frontend/js/vaults.js`, add a "Withdraw" button to each vault.
        -   Create a withdraw function that prompts the user for the amount and wallet, similar to the deposit functionality.
        -   Call the new `/vaults/withdraw` endpoint.

2.  **Display User Vault Equity:**
    -   **Backend:**
        -   Add a `get_user_vault_equity` method to the `HyperliquidAPI` class, which calls the `user_vault_equities` method from the SDK.
        -   Create a new endpoint `GET /wallets/{wallet_address}/vault-equity` in `backend/routers/wallets.py`.
    -   **Frontend:**
        -   In `frontend/js/vaults.js`, after fetching the list of vaults, make a call to the new endpoint for the selected wallet.
        -   Display the user's equity for each vault.

3.  **Display Vault Details & PNL Chart:**
    -   **Backend:**
        -   Add a `get_vault_details` method to the `HyperliquidAPI` class, which calls the `vault_details` method from the SDK.
        -   Create a new endpoint `GET /vaults/{vault_address}/details` in `backend/routers/vaults.py`.
    -   **Frontend:**
        -   In `frontend/js/vaults.js`, when a user clicks on a vault, make a call to the new endpoint.
        -   Display the vault details (name, description, performance, etc.) in a modal or a dedicated details section.
        -   Integrate TradingView's Lightweight Charts to display the PNL chart from the `vault_details` data.

4.  **Vault Leaderboard:**
    -   **Backend:**
        -   The existing `/vaults/meta` endpoint can be used for the leaderboard. The data will need to be sorted and ranked.
    -   **Frontend:**
        -   In `frontend/js/vaults.js`, sort the vaults returned from `/vaults/meta` by performance metrics (e.g., APY).
        -   Display the vaults in a ranked list or table.

## Phase 2: Dashboard Enhancements

This phase focuses on improving the Dashboard to provide a more comprehensive overview of the user's trading activity.

1.  **Consolidate and Enhance Orders/Positions View:**
    -   **Backend:**
        -   Modify the `/wallets/{wallet_id}/open-orders` endpoint in `backend/routers/wallets.py` to include more order details from the `frontendOpenOrders` info endpoint.
        -   Add a `bot_id` or `source` (manual/bot) to the `Trade` model in `backend/models.py` to track the origin of orders.
    -   **Frontend:**
        -   In `frontend/index.html`, merge the "Open Orders" and "Positions" sections into a single, tabbed component.
        -   In `frontend/js/dashboard.js`, update the UI to display the additional order details.
        -   Implement a "Cancel" button for each open order, which calls a new backend endpoint.
        -   Implement a "Cancel All" button.

2.  **Real-time Updates with WebSockets:**
    -   **Backend:**
        -   Use FastAPI's `WebSocket` support to create a new WebSocket endpoint (e.g., `/ws/updates`).
        -   When a client connects, subscribe to the Hyperliquid WebSocket for order and position updates for the user's wallets.
        -   Forward the updates to the frontend client.
    -   **Frontend:**
        -   In `frontend/js/dashboard.js`, establish a WebSocket connection to the new endpoint.
        -   Update the orders and positions table in real-time as messages are received.
        -   Implement browser notifications for order fills.

3.  **Portfolio Value and Historical Data:**
    -   **Backend:**
        -   Add methods to `HyperliquidAPI` to fetch historical fills (`userFills`), historical orders (`historicalOrders`), and portfolio values (`portfolio`).
        -   Create new endpoints in `backend/routers/wallets.py` to expose this data.
    -   **Frontend:**
        -   In `frontend/js/dashboard.js`, fetch the historical portfolio value and display it on a TradingView Lightweight Chart.
        -   Add tabs or sections to display historical orders and fills.

4.  **Multi-Account Management for Fund Managers:**
    -   **Objective:** Design the platform with the primary use case of a fund manager who needs to manage multiple, separate client accounts and their subaccounts efficiently.
    -   **Backend:**
        -   Implement robust support for creating and managing subaccounts via the Hyperliquid API (`subAccounts` endpoint).
        -   Create endpoints to transfer funds between a main account and its subaccounts.
        -   Develop a powerful "Consolidated View" endpoint that aggregates key metrics (total portfolio value, overall P&L, open orders across all managed accounts) for a high-level overview.
        -   Ensure all trading and data endpoints can operate on behalf of a subaccount.
    -   **Frontend:**
        -   Create a dedicated "Account Management" interface where a fund manager can easily view and switch between different primary accounts and their subaccounts.
        -   The "Consolidated View" on the dashboard should be the default, showing the aggregated data.
        -   The wallet/account selector should be a tree-like structure, allowing the manager to select a primary account (to view its consolidated subaccount data) or drill down to a specific subaccount to trade on its behalf.
        -   The UI should always make it clear which account/subaccount is currently active for trading.

5.  **Wallet Import/Export:**
    -   **Backend:**
        -   Create endpoints `POST /wallets/import` and `GET /wallets/export`.
        -   The export endpoint will return a JSON file of the user's wallets.
        -   The import endpoint will accept a JSON file and create the wallets.
    -   **Frontend:**
        -   Add "Import" and "Export" buttons to the dashboard.

6.  **Display Funding Rate History:**
    -   **Backend:**
        -   Add a `get_funding_history` method to `HyperliquidAPI`.
        -   Create a new endpoint `GET /market/funding-history?symbol=<symbol>` to expose this data.
    -   **Frontend:**
        -   On the dashboard or trading page, add a new section or modal to display historical funding rates for a selected asset.

## Phase 3: Trading Page Upgrades

This phase focuses on enhancing the manual trading experience on the Trading Page.

1.  **Advanced Order Types and Order Modification:**
    -   **Backend:**
        -   Update the `place_order` method in `HyperliquidAPI` to support advanced order types (trigger, TP/SL, time-in-force).
        -   Add a `modify_order` method to `HyperliquidAPI`.
        -   Update the `/trades/` endpoint in `backend/routers/trades.py` to handle the new order types.
        -   Create a new endpoint `PUT /trades/{order_id}` for modifying orders.
    -   **Frontend:**
        -   In `frontend/js/trading.js`, update the order form to include options for advanced order types.
        -   Add a "Modify" button to open orders, which opens a form to modify the order.

2.  **Client Order ID (cloid):**
    -   **Backend:**
        -   Update the `place_order` method and endpoint to accept an optional `cloid`.
    -   **Frontend:**
        -   In `frontend/js/trading.js`, generate a unique `cloid` for each order and send it with the request.

3.  **TradingView Lightweight Charts and Depth Chart:**
    -   **Frontend:**
        -   Integrate TradingView's Lightweight Charts into the trading page to display price charts.
        -   Use the Hyperliquid API's market data to fetch and display a real-time depth chart.

4.  **Click-to-Trade:**
    -   **Frontend:**
        -   In `frontend/js/trading.js`, add event listeners to the order book and chart.
        -   When a user clicks on a price, automatically populate the price field in the order form.

5.  **Implement Spot Trading:**
    -   **Backend:**
        -   Add methods to `HyperliquidAPI` to handle spot orders, spot balances, and spot-specific market data.
        -   Create new endpoints in `backend/routers/trades.py` specifically for spot trading (e.g., `POST /trades/spot`).
        -   Update wallet endpoints to differentiate between perpetual and spot balances.
    -   **Frontend:**
        -   In `frontend/trading.html`, add a UI toggle to switch between Perpetual and Spot trading modes.
        -   The order form in `frontend/js/trading.js` must adapt to the selected mode, showing relevant options for spot orders.
        -   Update the positions/orders display to correctly show spot assets and open spot orders.

## Phase 4: Bot Lab Improvements

This phase focuses on expanding the capabilities of the custom trading bots.

1.  **Leverage, Real-time Order Book, and Info Endpoints for Bots:**
    -   **Backend:**
        -   In `backend/bot_runner.py`, enhance the `BotTradingAPI` provided to bots.
        -   Add a method to set leverage (`updateLeverage`).
        -   Expose the `info` endpoint methods from `HyperliquidAPI`.
        -   Provide access to the `l2Book` data from the WebSocket.
    -   **Bot Code:**
        -   Update the bot execution environment to allow bots to use these new features.

## Phase 5: Documentation and Finalization

1.  **Update Documentation:**
    -   Update `docs/api.md` and `docs/user_guide.md` to reflect all the new features and changes.
    -   Ensure the documentation for the removed "Staking" feature is not present.
2.  **Final Review and Testing:**
    -   Perform a final review of all new features.
    -   Conduct thorough testing to ensure everything is working as expected.

This plan will be used to guide the development process. Each phase will be broken down into smaller, manageable tasks.
