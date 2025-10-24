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

            const modifyButton = document.createElement("button");
            modifyButton.textContent = "Modify";
            modifyButton.addEventListener("click", () => {
                const newSize = prompt("Enter new size:", order.sz);
                const newPrice = prompt("Enter new price:", order.limitPx);
                if (newSize && newPrice) {
                    modifyOrder(order.oid, order.coin, parseFloat(newSize), parseFloat(newPrice));
                }
            });
            row.insertCell(4).appendChild(modifyButton);
        });
    }

    async function modifyOrder(orderId, symbol, newSize, newPrice) {
        const walletId = walletSelector.value;
        const order_type = { "limit": { "tif": "Gtc" } }; // Assuming GTC for simplicity
        try {
            const response = await fetch(`http://localhost:8000/trades/${orderId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    wallet_id: parseInt(walletId),
                    symbol: symbol,
                    sz: newSize,
                    limit_px: newPrice,
                    order_type: order_type
                })
            });

            if (response.ok) {
                orderMessage.textContent = "Order modified successfully!";
                orderMessage.style.color = "green";
                fetchAllTradingData(walletId); // Refresh data
            } else {
                const error = await response.json();
                orderMessage.textContent = `Order modification failed: ${error.detail}`;
                orderMessage.style.color = "red";
            }
        } catch (error) {
            orderMessage.textContent = "An error occurred while modifying the order.";
            orderMessage.style.color = "red";
        }
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

    const orderTypeSelector = document.getElementById("order-type");
    const triggerPriceContainer = document.getElementById("trigger-price-container");

    orderTypeSelector.addEventListener("change", () => {
        if (orderTypeSelector.value === "trigger") {
            triggerPriceContainer.style.display = "block";
        } else {
            triggerPriceContainer.style.display = "none";
        }
    });

    const tradingModeSelector = document.getElementById("trading-mode");

    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const walletId = walletSelector.value;
        const symbol = document.getElementById("symbol").value;
        const is_buy = document.getElementById("side").value === "buy";
        const sz = parseFloat(document.getElementById("size").value);
        const limit_px = parseFloat(document.getElementById("price").value);
        const orderType = document.getElementById("order-type").value;
        const timeInForce = document.getElementById("time-in-force").value;
        const tradingMode = tradingModeSelector.value;

        let order_type = {};
        if (orderType === 'limit') {
            order_type = { "limit": { "tif": timeInForce } };
        } else if (orderType === 'market') {
            order_type = { "market": {} };
        } else if (orderType === 'trigger') {
            const trigger_px = parseFloat(document.getElementById("trigger-price").value);
            order_type = { "trigger": { "trigger_px": trigger_px, "is_market": false, "order_type": { "limit": { "tif": timeInForce } } } };
        }

        const endpoint = tradingMode === 'spot' ? `http://localhost:8000/trades/spot` : `http://localhost:8000/trades/`;

        try {
            const response = await fetch(endpoint, {
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
