# System Architecture

This document provides a detailed overview of the trading platform's architecture. The system is designed to be a robust, extensible, and secure platform for managing cryptocurrency wallets, executing trades, and running custom automated trading bots on the Hyperliquid exchange.

## High-Level Design

The platform follows a classic client-server architecture, composed of three main parts:

1.  **Frontend:** A web-based user interface built with standard HTML, CSS, and JavaScript. This ensures broad compatibility across devices, including desktops and mobile phones.
2.  **Backend:** A powerful Python application built with the FastAPI framework. It serves as the core of the system, handling all business logic, user authentication, and communication with the exchange.
3.  **Database:** A PostgreSQL database that provides persistent storage for all application data, including user accounts, wallets, bots, and trade history.

![High-Level Architecture Diagram](httpst://i.imgur.com/example.png)  <!-- Placeholder for a diagram -->

---

## Component Breakdown

### Frontend

The frontend is intentionally kept simple to ensure fast load times and ease of maintenance.

-   **Technologies:** HTML5, CSS3, JavaScript (ES6+).
-   **Responsibilities:**
    -   Displaying data fetched from the backend (e.g., wallet balances, open trades).
    -   Providing a user-friendly interface for interacting with the platform's features (e.g., creating bots, managing wallets).
    -   Handling user input and sending requests to the backend API.

### Backend

The backend is the heart of the application, designed for performance and security.

-   **Framework:** FastAPI on top of Python 3.
-   **Key Libraries:**
    -   **SQLAlchemy:** For Object-Relational Mapping (ORM) to interact with the PostgreSQL database.
    -   **Pydantic:** For data validation and settings management.
    -   **Passlib & python-jose:** For password hashing and JWT-based authentication.
-   **Responsibilities:**
    -   **API Server:** Exposing a RESTful API for the frontend to consume.
    -   **User & Wallet Management:** Handling user registration, login, and the secure storage of wallet information.
    -   **Bot Execution Engine:** Managing the lifecycle of custom Python trading bots.
    -   **Exchange Integration:** Communicating with the Hyperliquid API to place trades and fetch market data.

### Database

The database is the system's source of truth, chosen for its reliability and feature set.

-   **Engine:** PostgreSQL.
-   **Key Features Used:**
    -   **Relational Model:** To enforce data integrity between users, wallets, and trades.
    -   **JSON Support:** For storing flexible data structures like bot input schemas.
-   **Responsibilities:**
    -   Storing user account information (usernames, hashed passwords).
    -   Persisting wallet details, including encrypted private keys.
    -   Saving bot code and their configurations.
    -   Recording a history of all trades made, whether manually or by bots.

---

## Security Considerations

Even as an internal tool, security is a priority.

-   **Authentication:** User access is protected by a JWT-based authentication system. All sensitive API endpoints require a valid token.
-   **Password Storage:** User passwords are not stored in plaintext. They are hashed using `bcrypt` before being saved to the database.
-   **Private Key Storage:** Wallet private keys are encrypted using the `cryptography` library before being stored in the database, providing a critical layer of security.
-   **Configuration:** Sensitive information like database credentials and secret keys are managed through environment variables and are not hardcoded in the source.

## Future Extensibility

The architecture is designed with future growth in mind. The exchange integration logic is encapsulated within a dedicated module, which will make it easier to add support for other exchanges in the future without requiring a major overhaul of the system.
