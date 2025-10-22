# API Documentation

This document provides detailed information about the backend API endpoints.

## Base URL

The base URL for the API is `http://127.0.0.1:8000`.

## Authentication

All endpoints (except for `/users/` and `/token`) require a valid JWT to be included in the `Authorization` header of the request:

```
Authorization: Bearer <your-jwt-token>
```

---

## User Authentication

### `POST /users/`

Creates a new user account.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "id": 0,
  "username": "string"
}
```

### `POST /token`

Authenticates a user and returns a JWT.

**Request Body (Form Data):**

-   `username`: The user's username.
-   `password`: The user's password.

**Response:**

```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

### `GET /users/me/`

Returns the details of the currently authenticated user.

**Response:**

```json
{
  "id": 0,
  "username": "string"
}
```

---

## Wallet Management

### `POST /wallets/`

Adds a new wallet for the authenticated user.

**Request Body:**

```json
{
  "name": "string",
  "address": "string",
  "private_key": "string"
}
```

**Response:**

```json
{
  "id": 0,
  "name": "string",
  "address": "string",
  "owner_id": 0
}
```

### `GET /wallets/`

Returns a list of all wallets for the authenticated user.

**Response:**

A list of wallet objects, as shown below:

```json
[
  {
    "id": 0,
    "name": "string",
    "address": "string",
    "owner_id": 0
  }
]
```

---

## Bot Management

### `POST /bots/{bot_id}/run`

Starts a new process for the specified bot.

**Request Body:**

```json
{
  "wallet_id": 0,
  "capital_allocation": 0.0,
  "runtime_inputs": {}
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Bot <bot_id> started with PID <process_id>"
}
```

### `POST /bots/{bot_id}/stop`

Stops a running bot process.

**Response:**

```json
{
  "status": "success",
  "message": "Bot <bot_id> stopped"
}
```
