document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "account.html";
        return;
    }

    const vaultsTable = document.getElementById("vaults-table").getElementsByTagName('tbody')[0];
    const vaultSelector = document.getElementById("vault-selector");
    const walletSelector = document.getElementById("wallet-selector");
    const depositForm = document.getElementById("deposit-form");
    const depositMessage = document.getElementById("deposit-message");

    let vaults = [];
    let wallets = [];

    async function initialize() {
        await Promise.all([fetchVaults(), fetchWallets()]);
        populateVaultSelector();
        populateWalletSelector();
        displayVaults();
    }

    async function fetchVaults() {
        try {
            const response = await fetch("http://localhost:8000/vaults/meta", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch vaults");
            vaults = await response.json();
        } catch (error) {
            console.error("Error fetching vaults:", error);
        }
    }

    async function fetchWallets() {
        try {
            const response = await fetch("http://localhost:8000/wallets/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch wallets");
            wallets = await response.json();
        } catch (error) {
            console.error("Error fetching wallets:", error);
        }
    }

    function populateVaultSelector() {
        vaultSelector.innerHTML = "";
        vaults.forEach(vault => {
            const option = document.createElement("option");
            option.value = vault.vaultAddress;
            option.textContent = vault.name;
            vaultSelector.appendChild(option);
        });
    }

    function populateWalletSelector() {
        walletSelector.innerHTML = "";
        wallets.forEach(wallet => {
            const option = document.createElement("option");
            option.value = wallet.id;
            option.textContent = `${wallet.name} - ${wallet.address}`;
            walletSelector.appendChild(option);
        });
    }

    function displayVaults() {
        vaultsTable.innerHTML = "";
        vaults.forEach(vault => {
            const row = vaultsTable.insertRow();
            row.insertCell(0).textContent = vault.name;
            row.insertCell(1).textContent = vault.description;
        });
    }

    depositForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const wallet_id = parseInt(walletSelector.value);
        const vault_address = vaultSelector.value;
        const amount = parseInt(document.getElementById("deposit-amount").value);

        try {
            const response = await fetch("http://localhost:8000/vaults/deposit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ wallet_id, vault_address, amount })
            });

            if (response.ok) {
                depositMessage.textContent = "Deposit successful!";
                depositMessage.style.color = "green";
            } else {
                const error = await response.json();
                depositMessage.textContent = `Deposit failed: ${error.detail}`;
                depositMessage.style.color = "red";
            }
        } catch (error) {
            depositMessage.textContent = "An error occurred during the deposit.";
            depositMessage.style.color = "red";
        }
    });

    initialize();
});
