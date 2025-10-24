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
                const response = await fetch("/users/", {
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
                const response = await fetch("/users/token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
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

    const exportButton = document.getElementById("export-wallets-button");
    const importButton = document.getElementById("import-wallets-button");
    const importInput = document.getElementById("import-wallets-input");

    if (exportButton) {
        exportButton.addEventListener("click", async () => {
            const token = localStorage.getItem("jwt");
            if (!token) return;

            try {
                const response = await fetch("/wallets/export", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const wallets = await response.json();
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wallets));
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", "wallets.json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                } else {
                    alert("Failed to export wallets.");
                }
            } catch (error) {
                console.error("Error exporting wallets:", error);
                alert("An error occurred while exporting wallets.");
            }
        });
    }

    if (importButton) {
        importButton.addEventListener("click", () => {
            importInput.click();
        });
    }

    if (importInput) {
        importInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const wallets = JSON.parse(e.target.result);
                    const token = localStorage.getItem("jwt");
                    if (!token) return;

                    const response = await fetch("/wallets/import", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(wallets)
                    });

                    if (response.ok) {
                        alert("Wallets imported successfully!");
                    } else {
                        alert("Failed to import wallets.");
                    }
                } catch (error) {
                    console.error("Error importing wallets:", error);
                    alert("An error occurred while importing wallets.");
                }
            };
            reader.readAsText(file);
        });
    }
});
