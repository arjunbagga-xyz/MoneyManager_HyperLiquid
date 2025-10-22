// Main JavaScript file for the trading platform

document.addEventListener("DOMContentLoaded", () => {
    const walletList = document.getElementById("wallet-list");

    if (walletList) {
        fetchWallets();
    }
});

async function fetchWallets() {
    //
    // In a real application, you would get the JWT from a secure storage after the user logs in.
    const token = "your-jwt-token"; // Replace with a valid token for testing

    try {
        const response = await fetch("http://localhost:8000/wallets/", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch wallets");
        }

        const wallets = await response.json();
        displayWallets(wallets);
    } catch (error) {
        console.error("Error fetching wallets:", error);
        const walletList = document.getElementById("wallet-list");
        walletList.innerHTML = "<p>Error loading wallets. Please make sure you are logged in.</p>";
    }
}

function displayWallets(wallets) {
    const walletList = document.getElementById("wallet-list");
    walletList.innerHTML = ""; // Clear any existing content

    if (wallets.length === 0) {
        walletList.innerHTML = "<p>No wallets found.</p>";
        return;
    }

    const ul = document.createElement("ul");
    wallets.forEach(wallet => {
        const li = document.createElement("li");
        li.textContent = `${wallet.name} - ${wallet.address}`;
        ul.appendChild(li);
    });
    walletList.appendChild(ul);
}
