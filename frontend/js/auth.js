document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const logoutButton = document.getElementById("logout-button");
    const authMessage = document.getElementById("auth-message");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("register-username").value;
            const password = document.getElementById("register-password").value;

            try {
                const response = await fetch("http://localhost:8000/users/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                if (response.ok) {
                    authMessage.textContent = "Registration successful! You can now log in.";
                    authMessage.style.color = "green";
                } else {
                    const error = await response.json();
                    authMessage.textContent = `Registration failed: ${error.detail}`;
                    authMessage.style.color = "red";
                }
            } catch (error) {
                authMessage.textContent = "An error occurred during registration.";
                authMessage.style.color = "red";
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("login-username").value;
            const password = document.getElementById("login-password").value;

            try {
                const response = await fetch("http://localhost:8000/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `username=${username}&password=${password}`,
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem("jwt", data.access_token);
                    authMessage.textContent = "Login successful!";
                    authMessage.style.color = "green";
                    window.location.href = "index.html"; // Redirect to dashboard
                } else {
                    authMessage.textContent = "Login failed: Invalid username or password.";
                    authMessage.style.color = "red";
                }
            } catch (error) {
                authMessage.textContent = "An error occurred during login.";
                authMessage.style.color = "red";
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("jwt");
            authMessage.textContent = "You have been logged out.";
            authMessage.style.color = "green";
        });
    }
});
