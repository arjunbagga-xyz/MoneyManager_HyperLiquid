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
