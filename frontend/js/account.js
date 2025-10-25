document.addEventListener("DOMContentLoaded", () => {
    const addWalletForm = document.getElementById("add-wallet-form");
    const walletMessage = document.getElementById("wallet-message");

    if (addWalletForm) {
        addWalletForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const walletName = document.getElementById("wallet-name").value;
            const privateKey = document.getElementById("wallet-private-key").value;
            const token = localStorage.getItem("jwt");

            if (!token) {
                walletMessage.textContent = "You must be logged in to add a wallet.";
                walletMessage.style.color = "red";
                return;
            }

            try {
                const response = await fetch("/wallets/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({ name: walletName, private_key: privateKey }),
                });

                if (response.ok) {
                    walletMessage.textContent = "Wallet added successfully!";
                    walletMessage.style.color = "green";
                    addWalletForm.reset();
                } else {
                    const error = await response.json();
                    console.error("Error adding wallet:", JSON.stringify(error, null, 2)); // Log the full error
                    walletMessage.textContent = `Failed to add wallet: ${error.detail || 'Unknown error'}`;
                    walletMessage.style.color = "red";
                }
            } catch (error) {
                walletMessage.textContent = "An error occurred while adding the wallet.";
                walletMessage.style.color = "red";
            }
        });
    }
});
