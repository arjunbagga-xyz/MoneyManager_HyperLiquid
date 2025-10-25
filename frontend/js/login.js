document.addEventListener("DOMContentLoaded", () => {
    // Tab switching
    const tabs = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(item => item.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Form handlers
    const registerForm = document.getElementById("register-form");
    const loginForm = document.getElementById("login-form");
    const authMessage = document.getElementById("auth-message");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("register-username").value;
            const password = document.getElementById("register-password").value;
            const confirmPassword = document.getElementById("register-confirm-password").value;

            if (password !== confirmPassword) {
                authMessage.textContent = "Passwords do not match.";
                authMessage.style.color = "var(--error-color)";
                return;
            }

            try {
                const response = await fetch("/users/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                if (response.ok) {
                    authMessage.textContent = "Registration successful! You can now log in.";
                    authMessage.style.color = "var(--success-color)";
                    // Switch to login tab
                    document.querySelector('.tab-link[data-tab="login"]').click();
                } else {
                    const error = await response.json();
                    authMessage.textContent = `Registration failed: ${error.detail}`;
                    authMessage.style.color = "var(--error-color)";
                }
            } catch (error) {
                authMessage.textContent = "An error occurred during registration.";
                authMessage.style.color = "var(--error-color)";
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("login-username").value;
            const password = document.getElementById("login-password").value;

            try {
                const response = await fetch("/users/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem("jwt", data.access_token);
                    window.location.href = "index.html"; // Redirect to dashboard
                } else {
                    authMessage.textContent = "Login failed: Invalid username or password.";
                    authMessage.style.color = "var(--error-color)";
                }
            } catch (error) {
                authMessage.textContent = "An error occurred during login.";
                authMessage.style.color = "var(--error-color)";
            }
        });
    }
});
