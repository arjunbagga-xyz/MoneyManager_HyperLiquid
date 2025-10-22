// Main JavaScript file for the trading platform

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        // If no token is found, redirect to the account page to log in
        window.location.href = "account.html";
        return; // Stop further execution
    }

    const walletList = document.getElementById("wallet-list");
    if (walletList) {
        fetchWalletsAndBalances(token);
    }
});

async function fetchWalletsAndBalances(token) {
    try {
        const response = await fetch("http://localhost:8000/wallets/", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.status === 401) {
            window.location.href = "account.html";
            return;
        }
        if (!response.ok) { throw new Error("Failed to fetch wallets"); }

        const wallets = await response.json();

        // Fetch the balance for each wallet
        for (const wallet of wallets) {
            const balanceResponse = await fetch(`http://localhost:8000/wallets/${wallet.address}/balance`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (balanceResponse.ok) {
                const balanceData = await balanceResponse.json();
                wallet.balance = parseFloat(balanceData.balance).toFixed(2); // Format to 2 decimal places
            } else {
                wallet.balance = "N/A";
            }
        }

        displayWallets(wallets);

    } catch (error) {
        console.error("Error fetching data:", error);
        const walletList = document.getElementById("wallet-list");
        walletList.innerHTML = "<p>Error loading wallets. Please try again.</p>";
    }
}

function displayWallets(wallets) {
    const walletList = document.getElementById("wallet-list");
    walletList.innerHTML = ""; // Clear any existing content

    if (wallets.length === 0) {
        walletList.innerHTML = "<p>No wallets found. Add one on the Account page.</p>";
        return;
    }

    const ul = document.createElement("ul");
    wallets.forEach(wallet => {
        const li = document.createElement("li");
        li.textContent = `${wallet.name} - ${wallet.address} (Balance: ${wallet.balance} USDC)`;
        ul.appendChild(li);
    });
    walletList.appendChild(ul);
}
