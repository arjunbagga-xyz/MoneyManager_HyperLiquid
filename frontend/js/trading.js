document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "account.html";
        return;
    }

    const walletSelector = document.getElementById("wallet-selector");
    const orderForm = document.getElementById("order-form");
    const openOrdersTable = document.getElementById("open-orders-table").getElementsByTagName('tbody')[0];
    const positionsTable = document.getElementById("positions-table").getElementsByTagName('tbody')[0];
    const orderMessage = document.getElementById("order-message");

    let wallets = [];

    async function initialize() {
        await fetchWallets();
        if (wallets.length > 0) {
            populateWalletSelector();
            const selectedWalletId = walletSelector.value;
            fetchAllTradingData(selectedWalletId);
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

    function populateWalletSelector() {
        walletSelector.innerHTML = "";
        wallets.forEach(wallet => {
            const option = document.createElement("option");
            option.value = wallet.id;
            option.textContent = `${wallet.name} - ${wallet.address}`;
            walletSelector.appendChild(option);
        });
    }

    async function fetchAllTradingData(walletId) {
        fetchOpenOrders(walletId);
        fetchPositions(walletId);
    }

    async function fetchOpenOrders(walletId) {
        try {
            const response = await fetch(`http://localhost:8000/wallets/${walletId}/open-orders`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch open orders");
            const orders = await response.json();
            displayOpenOrders(orders);
        } catch (error) {
            console.error("Error fetching open orders:", error);
        }
    }

    function displayOpenOrders(orders) {
        openOrdersTable.innerHTML = "";
        orders.forEach(order => {
            const row = openOrdersTable.insertRow();
            row.insertCell(0).textContent = order.coin;
            row.insertCell(1).textContent = order.side;
            row.insertCell(2).textContent = order.sz;
            row.insertCell(3).textContent = order.limitPx;
        });
    }

    async function fetchPositions(walletId) {
        try {
            const response = await fetch(`http://localhost:8000/wallets/${walletId}/positions`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch positions");
            const positions = await response.json();
            displayPositions(positions);
        } catch (error) {
            console.error("Error fetching positions:", error);
        }
    }

    function displayPositions(positions) {
        positionsTable.innerHTML = "";
        positions.forEach(position => {
            const row = positionsTable.insertRow();
            row.insertCell(0).textContent = position.position.coin;
            row.insertCell(1).textContent = position.position.szi;
            row.insertCell(2).textContent = position.position.entryPx;
            row.insertCell(3).textContent = position.unrealizedPnl;
        });
    }

    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const walletId = walletSelector.value;
        const symbol = document.getElementById("symbol").value;
        const is_buy = document.getElementById("side").value === "buy";
        const sz = parseFloat(document.getElementById("size").value);
        const limit_px = parseFloat(document.getElementById("price").value);
        const orderType = document.getElementById("order-type").value;

        let order_type = {};
        if (orderType === 'limit') {
            order_type = { "limit": { "tif": "Gtc" } };
        } else {
            order_type = { "market": {} };
        }

        try {
            const response = await fetch(`http://localhost:8000/trades/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ wallet_id: parseInt(walletId), symbol, is_buy, sz, limit_px, order_type })
            });

            if (response.ok) {
                orderMessage.textContent = "Order placed successfully!";
                orderMessage.style.color = "green";
                fetchAllTradingData(walletId); // Refresh data
            } else {
                const error = await response.json();
                orderMessage.textContent = `Order failed: ${error.detail}`;
                orderMessage.style.color = "red";
            }
        } catch (error) {
            orderMessage.textContent = "An error occurred while placing the order.";
            orderMessage.style.color = "red";
        }
    });

    walletSelector.addEventListener("change", () => {
        const selectedWalletId = walletSelector.value;
        fetchAllTradingData(selectedWalletId);
    });

    initialize();
});
