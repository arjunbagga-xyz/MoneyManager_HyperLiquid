# Workflows

This document outlines the key workflows within the trading platform.

## User Authentication Workflow

This workflow describes how a user authenticates with the system to gain access to protected resources.

1.  **User Registration:**
    -   A new user signs up by providing a `username` and `password` to the `POST /users/` endpoint.
    -   The backend hashes the password and stores the new user's credentials in the `users` table.

2.  **User Login:**
    -   The user logs in by submitting their `username` and `password` to the `POST /token` endpoint.
    -   The backend verifies the credentials against the stored hashed password.
    -   If the credentials are valid, the backend generates a **JSON Web Token (JWT)**.

3.  **Authenticated Requests:**
    -   The JWT is returned to the client, which must then include it in the `Authorization` header for all subsequent requests to protected endpoints.
    -   The backend validates the JWT on each request to ensure the user is authenticated and has the right to access the requested resource.

![User Authentication Workflow Diagram](https://i.imgur.com/example.png) <!-- Placeholder for a diagram -->

---

## Bot Execution Workflow

This workflow describes how a custom trading bot is executed.

1.  **User Initiates Run:**
    -   The user navigates to the "Bot Lab" and clicks the "Run" button next to a saved bot.
    -   A modal form appears, prompting the user to select a wallet, specify a capital allocation, and provide any inputs required by the bot's schema.

2.  **Frontend Sends Request:**
    -   The frontend sends a `POST` request to the `/bots/{bot_id}/run` endpoint, including the selected wallet ID and the runtime inputs.

3.  **Backend Processes Request:**
    -   The backend verifies that the bot and wallet belong to the authenticated user.
    -   It retrieves the bot's code and the wallet's (decrypted) private key from the database.
    -   It calls the `BotRunner` service to start the bot.

4.  **Bot Execution:**
    -   The `BotRunner` service creates a new, isolated process for the bot.
    -   The bot's Python code is executed within this new process, with the runtime inputs and private key passed in as context.
    -   The bot can then use these credentials to connect to the exchange and begin its trading logic.

![Bot Execution Workflow Diagram](https://i.imgur.com/example.png) <!-- Placeholder for a diagram -->

---

## Vault Deposit Workflow

This workflow describes how a user deposits funds into a vault.

1.  **User Navigates to Vaults:**
    -   The user opens the "Vaults" page.
    -   The frontend fetches and displays a list of available vaults from the `/vaults/meta` endpoint.

2.  **User Submits Deposit:**
    -   The user selects a vault, a wallet to deposit from, and an amount.
    -   The user submits the deposit form.

3.  **Backend Processes Request:**
    -   The frontend sends a `POST` request to the `/vaults/deposit` endpoint.
    -   The backend retrieves the selected wallet's private key.
    -   It then calls the Hyperliquid API to execute the vault transfer.
