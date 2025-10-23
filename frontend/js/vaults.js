document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/account.html";
    }

    const vaultList = document.getElementById("vault-list");

    // Fetch vaults
    fetch("http://localhost:8000/vaults/meta", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        data.forEach(vault => {
            const vaultElement = document.createElement("div");
            vaultElement.className = "vault";
            vaultElement.innerHTML = `
                <h3>${vault.name}</h3>
                <p>Description: ${vault.description}</p>
                <p>Address: ${vault.address}</p>
                <button class="deposit-btn" data-vault-address="${vault.address}">Deposit</button>
            `;
            vaultList.appendChild(vaultElement);
        });
    });

    // Handle deposit
    vaultList.addEventListener("click", function (event) {
        if (event.target.className === "deposit-btn") {
            const vaultAddress = event.target.dataset.vaultAddress;
            const amount = prompt("Enter amount to deposit:");
            if (amount) {
                const walletId = prompt("Enter wallet ID to deposit from:");
                if (walletId) {
                    fetch("http://localhost:8000/vaults/deposit", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            vault_address: vaultAddress,
                            amount: parseFloat(amount),
                            wallet_id: parseInt(walletId)
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        alert("Deposit successful!");
                    })
                    .catch(error => {
                        console.error("Error depositing into vault:", error);
                        alert("Deposit failed.");
                    });
                }
            }
        }
    });
});
