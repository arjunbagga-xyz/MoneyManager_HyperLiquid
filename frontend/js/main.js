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
        fetchWallets(token);
    }
});

async function fetchWallets(token) {
    try {
        const response = await fetch("http://localhost:8000/wallets/", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            // If the token is invalid or expired, redirect to the login page
            window.location.href = "account.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to fetch wallets");
        }

        const wallets = await response.json();
        displayWallets(wallets);
    } catch (error) {
        console.error("Error fetching wallets:", error);
        const walletList = document.getElementById("wallet-list");
        walletList.innerHTML = "<p>Error loading wallets. Please try again.</p>";
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
