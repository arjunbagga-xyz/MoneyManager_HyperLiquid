// A global function to be called by page-specific scripts
function onWalletReady(callback) {
    const checkWallet = () => {
        const selectedWallet = localStorage.getItem("selectedWallet");
        if (selectedWallet) {
            callback(JSON.parse(selectedWallet));
        } else {
            // If no wallet is selected, wait and check again
            setTimeout(checkWallet, 100);
        }
    };
    checkWallet();
}

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        // Redirect to login if not authenticated, except on the login/register page
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('account.html')) {
            window.location.href = "login.html";
        }
        return;
    }

    const nav = document.querySelector("header nav ul");
    if (nav) {
        const walletSelectorLi = document.createElement("li");
        walletSelectorLi.innerHTML = `
            <select id="wallet-selector">
                <option value="">Select a Wallet</option>
            </select>
        `;
        nav.appendChild(walletSelectorLi);

        const walletSelector = document.getElementById("wallet-selector");

        try {
            const response = await fetch("/wallets/", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const wallets = await response.json();
                wallets.forEach(wallet => {
                    const option = document.createElement("option");
                    option.value = JSON.stringify(wallet);
                    option.textContent = `${wallet.name} (${wallet.address.substring(0, 6)}...)`;
                    walletSelector.appendChild(option);
                });

                // Set the selector to the currently stored wallet, if any
                const selectedWallet = localStorage.getItem("selectedWallet");
                if (selectedWallet) {
                    walletSelector.value = selectedWallet;
                } else if (wallets.length > 0) {
                    // Or, default to the first wallet if none is selected
                    localStorage.setItem("selectedWallet", JSON.stringify(wallets[0]));
                    walletSelector.value = JSON.stringify(wallets[0]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch wallets:", error);
        }

        walletSelector.addEventListener("change", () => {
            if (walletSelector.value) {
                localStorage.setItem("selectedWallet", walletSelector.value);
                // Reload the page to apply the new wallet context
                window.location.reload();
            } else {
                localStorage.removeItem("selectedWallet");
            }
        });
    }
});
