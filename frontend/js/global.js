document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    // Don't run on the account page if the user isn't logged in
    if (!token && !window.location.pathname.endsWith('account.html')) {
        window.location.href = "account.html";
        return;
    }

    if (token) {
        initializeGlobalWalletSelector(token);
    }
});

async function initializeGlobalWalletSelector(token) {
    const selector = document.getElementById("global-wallet-selector");
    if (!selector) return;

    try {
        const response = await fetch("/wallets/", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            // Don't redirect from the account page if the token is invalid
            if (!window.location.pathname.endsWith('account.html')) {
                 window.location.href = "account.html";
            }
            return;
        }

        const wallets = await response.json();

        if (wallets.length === 0) {
            const option = document.createElement("option");
            option.textContent = "No wallets found";
            selector.appendChild(option);
            return;
        }

        wallets.forEach(wallet => {
            const option = document.createElement("option");
            option.value = wallet.address;
            option.dataset.walletId = wallet.id; // Store DB id for operations that need it
            option.textContent = `${wallet.name} (${wallet.address.substring(0, 6)}...)`;
            selector.appendChild(option);
        });

        const lastActiveWallet = localStorage.getItem("activeWallet");
        if (lastActiveWallet && wallets.some(w => w.address === lastActiveWallet)) {
            selector.value = lastActiveWallet;
        } else if (wallets.length > 0) {
            // Default to the first wallet if none was saved
            selector.value = wallets[0].address;
            localStorage.setItem("activeWallet", wallets[0].address);
        }

        // Initial dispatch of the event so pages can load data on start
        selector.dispatchEvent(new Event('change'));


        selector.addEventListener("change", () => {
            localStorage.setItem("activeWallet", selector.value);
            // Optionally, dispatch a custom event to notify other scripts on the page
            document.dispatchEvent(new CustomEvent('activeWalletChanged', { detail: { walletAddress: selector.value } }));
        });

    } catch (error) {
        console.error("Error initializing global wallet selector:", error);
    }
}

function getActiveWallet() {
    return localStorage.getItem("activeWallet");
}
