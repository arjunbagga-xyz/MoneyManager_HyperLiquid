document.addEventListener("DOMContentLoaded", () => {
    // Check for authentication token
    const token = localStorage.getItem("jwt");
    if (!token) {
        // If no token, redirect to login/register page
        // In a real app, you might have a separate login.html
        // For now, we'll just disable the content.
        document.body.innerHTML = "<h1>Please log in to view your account.</h1><a href='login.html'>Login</a>";
        return;
    }

    // Tab switching logic
    const tabs = document.querySelectorAll(".account-nav a");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            e.preventDefault();

            // Deactivate all tabs and content
            tabs.forEach(item => item.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            // Activate the clicked tab and its content
            tab.classList.add("active");
            const target = document.getElementById(tab.dataset.tab);
            if (target) {
                target.classList.add("active");
            }
        });
    });

    // Fetch and display username
    fetchUserInfo(token);

    // Password change form handler
    const passwordForm = document.getElementById("change-password-form");
    const passwordMessage = document.getElementById("password-message");

    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById("current-password").value;
            const newPassword = document.getElementById("new-password").value;
            const confirmPassword = document.getElementById("confirm-password").value;

            if (newPassword !== confirmPassword) {
                passwordMessage.textContent = "New passwords do not match.";
                passwordMessage.style.color = "var(--error-color)";
                return;
            }

            try {
                const response = await fetch("/users/change-password", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });

                if (response.ok) {
                    passwordMessage.textContent = "Password updated successfully!";
                    passwordMessage.style.color = "var(--success-color)";
                    passwordForm.reset();
                } else {
                    const error = await response.json();
                    passwordMessage.textContent = `Error: ${error.detail}`;
                    passwordMessage.style.color = "var(--error-color)";
                }
            } catch (error) {
                passwordMessage.textContent = "An unexpected error occurred.";
                passwordMessage.style.color = "var(--error-color)";
            }
        });
    }

    // Wallet Management Handlers
    const exportButton = document.getElementById("export-wallets-button");
    const importButton = document.getElementById("import-wallets-button");
    const importInput = document.getElementById("import-wallets-input");

    if (exportButton) {
        exportButton.addEventListener("click", async () => {
            try {
                const response = await fetch("/wallets/export", {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const wallets = await response.json();
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wallets, null, 2));
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
        importButton.addEventListener("click", () => importInput.click());
    }

    if (importInput) {
        importInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const wallets = JSON.parse(e.target.result);
                    const response = await fetch("/wallets/import", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(wallets)
                    });

                    if (response.ok) {
                        alert("Wallets imported successfully! Please refresh to see the updated list.");
                        // Optionally, trigger a refresh of the wallet selector
                        if (window.populateWalletSelector) {
                            window.populateWalletSelector();
                        }
                    } else {
                         const error = await response.json();
                        alert(`Failed to import wallets: ${error.detail}`);
                    }
                } catch (error) {
                    console.error("Error importing wallets:", error);
                    alert("An error occurred while importing wallets. Make sure the file is valid JSON.");
                }
            };
            reader.readAsText(file);
        });
    }

    // Create wallet form handler
    const createWalletForm = document.getElementById("create-wallet-form");
    if (createWalletForm) {
        createWalletForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const walletName = document.getElementById("wallet-name").value;
            try {
                const response = await fetch("/wallets/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({ name: walletName })
                });

                if (response.ok) {
                    alert("Wallet created successfully! The wallet list will refresh on the next page load.");
                    createWalletForm.reset();
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.detail}`);
                }
            } catch (error) {
                alert("An unexpected error occurred while creating the wallet.");
            }
        });
    }
});

async function fetchUserInfo(token) {
    try {
        const response = await fetch("/users/me/", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const user = await response.json();
            const usernameDisplay = document.getElementById("username-display");
            if (usernameDisplay) {
                usernameDisplay.textContent = user.username;
            }
        } else {
            console.error("Failed to fetch user info.");
        }
    } catch (error) {
        console.error("Error fetching user info:", error);
    }
}
