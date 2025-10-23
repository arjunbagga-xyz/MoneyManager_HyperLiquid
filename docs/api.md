# API Documentation

This document provides a detailed overview of the API endpoints available in the trading platform.

## Users

### POST /token

-   **Description:** Authenticates a user and returns a JWT access token.
-   **Request Body:** `application/x-www-form-urlencoded`
    -   `username`: The user's username.
    -   `password`: The user's password.
-   **Response:**
    ```json
    {
      "access_token": "your_access_token",
      "token_type": "bearer"
    }
    ```

### POST /

-   **Description:** Creates a new user.
-   **Request Body:**
    ```json
    {
      "username": "your_username",
      "password": "your_password"
    }
    ```
-   **Response:**
    ```json
    {
      "id": 1,
      "username": "your_username"
    }
    ```

### GET /me/

-   **Description:** Returns the currently authenticated user.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    {
      "id": 1,
      "username": "your_username"
    }
    ```

## Wallets

### POST /

-   **Description:** Creates a new wallet for the currently authenticated user.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Request Body:**
    ```json
    {
      "name": "My Wallet",
      "private_key": "your_private_key"
    }
    ```
-   **Response:**
    ```json
    {
      "id": 1,
      "name": "My Wallet",
      "address": "the_wallet_address"
    }
    ```

### GET /

-   **Description:** Returns a list of wallets for the currently authenticated user.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    [
      {
        "id": 1,
        "name": "My Wallet",
        "address": "the_wallet_address"
      }
    ]
    ```

### GET /{wallet_address}/balance

-   **Description:** Returns the balance of a given wallet.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    {
      "balance": "1234.56"
    }
    ```

### GET /{wallet_id}/open-orders

-   **Description:** Returns a list of open orders for a given wallet.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    [
      {
        "order_id": 123,
        "symbol": "BTC",
        "side": "buy",
        "price": 50000,
        "quantity": 0.1
      }
    ]
    ```

### GET /{wallet_id}/positions

-   **Description:** Returns a list of open positions for a given wallet.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    [
      {
        "symbol": "BTC",
        "side": "long",
        "entry_price": 48000,
        "quantity": 0.1
      }
    ]
    ```

## Trades

### POST /

-   **Description:** Places a new trade.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Request Body:**
    ```json
    {
      "wallet_id": 1,
      "symbol": "BTC",
      "is_buy": true,
      "sz": 0.1,
      "limit_px": 50000,
      "order_type": {
        "limit": {
          "tif": "Gtc"
        }
      }
    }
    ```
-   **Response:**
    ```json
    {
      "status": "ok",
      "response": {
        "type": "order",
        "data": {
          "statuses": [
            {
              "resting": {
                "oid": 1234567890
              }
            }
          ]
        }
      }
    }
    ```

## Bots

### POST /

-   **Description:** Creates a new bot.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Request Body:**
    ```json
    {
      "name": "My Bot",
      "code": "print('Hello, World!')",
      "input_schema": {
        "param1": "value1"
      }
    }
    ```
-   **Response:**
    ```json
    {
      "id": 1,
      "name": "My Bot",
      "code": "print('Hello, World!')",
      "input_schema": {
        "param1": "value1"
      }
    }
    ```

### GET /

-   **Description:** Returns a list of bots for the currently authenticated user.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    [
      {
        "id": 1,
        "name": "My Bot",
        "code": "print('Hello, World!')",
        "input_schema": {
          "param1": "value1"
        }
      }
    ]
    ```

### POST /{bot_id}/run

-   **Description:** Runs a bot.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Request Body:**
    ```json
    {
      "wallet_id": 1,
      "capital_allocation": 1000.0,
      "runtime_inputs": {
        "param1": "value1"
      }
    }
    ```
-   **Response:**
    ```json
    {
      "status": "success",
      "message": "Bot 1 started with PID 12345"
    }
    ```

### POST /{bot_id}/stop

-   **Description:** Stops a bot.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    {
      "status": "success",
      "message": "Bot 1 stopped"
    }
    ```

### GET /{bot_id}/logs

-   **Description:** Returns the logs for a bot.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```
    Hello, World!
    ```

## Staking

### GET /validators

-   **Description:** Returns a list of available validators.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    [
      {
        "address": "0x123...",
        "name": "Validator 1"
      }
    ]
    ```

### POST /delegate

-   **Description:** Delegates funds to a validator.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Request Body:**
    ```json
    {
      "wallet_id": 1,
      "validator_address": "0x123...",
      "amount": 100.0
    }
    ```
-   **Response:**
    ```json
    {
      "status": "ok"
    }
    ```

### POST /undelegate

-   **Description:** Undelegates funds from a validator.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Request Body:**
    ```json
    {
      "wallet_id": 1,
      "validator_address": "0x123...",
      "amount": 100.0
    }
    ```
-   **Response:**
    ```json
    {
      "status": "ok"
    }
    ```

## Vaults

### GET /meta

-   **Description:** Returns metadata about the available vaults.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Response:**
    ```json
    {
      "universe": []
    }
    ```

### POST /deposit

-   **Description:** Deposits funds into a vault.
-   **Authentication:** Requires a valid JWT in the `Authorization` header.
-   **Request Body:**
    ```json
    {
      "wallet_id": 1,
      "vault_address": "0x456...",
      "amount": 500.0
    }
    ```
-   **Response:**
    ```json
    {
      "status": "ok"
    }
    ```
