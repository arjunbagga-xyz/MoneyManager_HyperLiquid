# Database Schema

This document provides a detailed overview of the PostgreSQL database schema used by the trading platform. The schema is designed to be relational and enforce data integrity.

## Tables

### `users`

Stores information about the users of the platform.

| Column          | Type      | Constraints      | Description                                |
|-----------------|-----------|------------------|--------------------------------------------|
| `id`            | `INTEGER` | `PRIMARY KEY`    | Unique identifier for the user.            |
| `username`      | `STRING`  | `UNIQUE, INDEX`  | The user's chosen username for login.      |
| `hashed_password`| `STRING`  |                  | The user's password, hashed with bcrypt.   |

**Relationships:**
- Has a one-to-many relationship with the `wallets` and `bots` tables.

---

### `wallets`

Stores information about the cryptocurrency wallets managed by the users.

| Column        | Type      | Constraints      | Description                                      |
|---------------|-----------|------------------|--------------------------------------------------|
| `id`          | `INTEGER` | `PRIMARY KEY`    | Unique identifier for the wallet.                |
| `name`        | `STRING`  | `INDEX`          | A user-friendly name for the wallet.             |
| `address`     | `STRING`  | `UNIQUE, INDEX`  | The public address of the wallet.                |
| `private_key` | `STRING`  |                  | The wallet's private key, encrypted with Fernet. |
| `owner_id`    | `INTEGER` | `FOREIGN KEY`    | References the `id` of the user who owns the wallet. |

**Relationships:**
- Belongs to a single `user`.
- Has a one-to-many relationship with the `trades` table.

---

### `bots`

Stores the custom trading bots created by users.

| Column          | Type    | Constraints   | Description                                           |
|-----------------|---------|---------------|-------------------------------------------------------|
| `id`            | `INTEGER`| `PRIMARY KEY` | Unique identifier for the bot.                        |
| `name`          | `STRING`| `INDEX`       | A name for the bot.                                   |
| `code`          | `TEXT`  |               | The Python source code of the bot.                    |
| `input_schema`  | `JSON`  |               | A JSON schema defining the inputs the bot requires.   |
| `owner_id`      | `INTEGER`| `FOREIGN KEY` | References the `id` of the user who created the bot. |

**Relationships:**
- Belongs to a single `user`.
- Has a one-to-many relationship with the `trades` table.

---

### `trades`

Stores a record of all trades executed on the platform.

| Column        | Type       | Constraints   | Description                                               |
|---------------|------------|---------------|-----------------------------------------------------------|
| `id`          | `INTEGER`  | `PRIMARY KEY` | Unique identifier for the trade.                          |
| `symbol`      | `STRING`   | `INDEX`       | The trading pair (e.g., 'BTC-USD').                       |
| `side`        | `STRING`   |               | The side of the trade ('buy' or 'sell').                  |
| `price`       | `FLOAT`    |               | The price at which the trade was executed.                |
| `quantity`    | `FLOAT`    |               | The amount of the asset that was traded.                  |
| `timestamp`   | `DATETIME` |               | The time at which the trade was executed.                 |
| `wallet_id`   | `INTEGER`  | `FOREIGN KEY` | References the `id` of the wallet used for the trade.     |
| `bot_id`      | `INTEGER`  | `FOREIGN KEY` | If the trade was made by a bot, references the `id` of the bot. |

**Relationships:**
- Belongs to a single `wallet`.
- Can optionally belong to a single `bot`.
