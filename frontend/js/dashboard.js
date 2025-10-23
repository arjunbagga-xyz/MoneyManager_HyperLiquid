// Dashboard specific JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "account.html";
        return;
    }

    fetchWalletsAndBalances(token);
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

        displayWallets(wallets, token);

    } catch (error) {
        console.error("Error fetching data:", error);
        const walletList = document.getElementById("wallet-list");
        walletList.innerHTML = "<p>Error loading wallets. Please try again.</p>";
    }
}

function displayWallets(wallets, token) {
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
        li.dataset.walletId = wallet.id;
        li.addEventListener("click", () => {
            fetchOrdersAndPositions(wallet.id, token);
        });
        ul.appendChild(li);
    });
    walletList.appendChild(ul);
}

async function fetchOrdersAndPositions(walletId, token) {
    try {
        // Fetch open orders
        const ordersResponse = await fetch(`http://localhost:8000/wallets/${walletId}/open-orders`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (ordersResponse.ok) {
            const orders = await ordersResponse.json();
            displayOrders(orders);
        } else {
            throw new Error("Failed to fetch open orders");
        }

        // Fetch positions
        const positionsResponse = await fetch(`http://localhost:8000/wallets/${walletId}/positions`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (positionsResponse.ok) {
            const positions = await positionsResponse.json();
            displayPositions(positions);
        } else {
            throw new Error("Failed to fetch positions");
        }
    } catch (error) {
        console.error("Error fetching orders and positions:", error);
    }
}

function displayOrders(orders) {
    const orderList = document.getElementById("order-list");
    orderList.innerHTML = "";
    if (orders.length === 0) {
        orderList.innerHTML = "<p>No open orders.</p>";
        return;
    }
    const ul = document.createElement("ul");
    orders.forEach(order => {
        const li = document.createElement("li");
        li.textContent = `Symbol: ${order.coin}, Side: ${order.side}, Size: ${order.sz}, Price: ${order.limitPx}`;
        ul.appendChild(li);
    });
    orderList.appendChild(ul);
}

function displayPositions(positions) {
    const positionList = document.getElementById("position-list");
    positionList.innerHTML = "";
    if (positions.length === 0) {
        positionList.innerHTML = "<p>No open positions.</p>";
        return;
    }
    const ul = document.createElement("ul");
    positions.forEach(position => {
        const li = document.createElement("li");
        const entryPx = position.position.entryPx ? parseFloat(position.position.entryPx).toFixed(2) : "N/A";
        li.textContent = `Symbol: ${position.position.coin}, Size: ${position.position.szi}, Entry Price: ${entryPx}`;
        ul.appendChild(li);
    });
    positionList.appendChild(ul);
}
