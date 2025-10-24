// Dashboard specific JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "account.html";
        return;
    }

    let selectedWalletId = null;
    let ws = null;

    fetchWalletsAndBalances(token);
});

function initializeWebSocket(walletAddress, token) {
    if (ws) {
        ws.close();
    }

    ws = new WebSocket(`ws://localhost:8000/ws/updates/${walletAddress}`);

    ws.onopen = () => {
        console.log("WebSocket connection established");
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        // Add logic to update UI based on message type
        // For now, just refresh the wallet state
        if (selectedWalletId) {
            fetchWalletState(selectedWalletId, token);
            showNotification("Your wallet data has been updated!");
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed");
    };
}

function showNotification(message) {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
    } else if (Notification.permission === "granted") {
        new Notification(message);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(function (permission) {
            if (permission === "granted") {
                new Notification(message);
            }
        });
    }
}

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
        li.dataset.walletAddress = wallet.address;
        li.addEventListener("click", (event) => {
            selectedWalletId = event.currentTarget.dataset.walletId;
            const walletAddress = event.currentTarget.dataset.walletAddress;
            fetchWalletState(selectedWalletId, token);
            fetchOrderHistory(selectedWalletId, token);
            fetchTradeHistory(selectedWalletId, token);
            fetchPortfolioHistory(selectedWalletId, token);
            initializeWebSocket(walletAddress, token);
        });
        ul.appendChild(li);
    });
    walletList.appendChild(ul);
}

async function fetchWalletState(walletId, token) {
    try {
        const response = await fetch(`http://localhost:8000/wallets/${walletId}/state`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            displayOrders(data.open_orders);
            displayPositions(data.positions);
            displaySpotBalances(data.spot_balances);
        } else {
            throw new Error("Failed to fetch wallet state");
        }
    } catch (error) {
        console.error("Error fetching wallet state:", error);
    }
}

function displayOrders(orders) {
    const orderList = document.getElementById("order-list");
    orderList.innerHTML = "";
    if (orders.length === 0) {
        orderList.innerHTML = "<p>No open orders.</p>";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Size</th>
                <th>Price</th>
                <th>Type</th>
                <th>Timestamp</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector("tbody");

    orders.forEach(order => {
        const row = tbody.insertRow();
        const order_info = order.order;
        row.insertCell(0).textContent = order_info.coin;
        row.insertCell(1).textContent = order_info.side;
        row.insertCell(2).textContent = order_info.sz;
        row.insertCell(3).textContent = order_info.limitPx;
        row.insertCell(4).textContent = order_info.trigger ? "Trigger" : "Limit/Market";
        row.insertCell(5).textContent = new Date(order_info.timestamp).toLocaleString();

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.dataset.oid = order_info.oid;
        cancelButton.dataset.symbol = order_info.coin;
        cancelButton.addEventListener("click", cancelOrder);
        row.insertCell(6).appendChild(cancelButton);
    });

    orderList.appendChild(table);

    const cancelAllButton = document.createElement("button");
    cancelAllButton.textContent = "Cancel All Orders";
    cancelAllButton.addEventListener("click", cancelAllOrders);
    orderList.appendChild(cancelAllButton);
}

async function cancelOrder(event) {
    const oid = event.target.dataset.oid;
    const symbol = event.target.dataset.symbol;
    const token = localStorage.getItem("jwt");

    try {
        const response = await fetch(`http://localhost:8000/trades/cancel`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                wallet_id: selectedWalletId,
                symbol: symbol,
                oid: parseInt(oid)
            })
        });

        if (response.ok) {
            alert("Order cancelled successfully!");
            fetchWalletState(selectedWalletId, token);
        } else {
            const error = await response.json();
            alert(`Failed to cancel order: ${error.detail}`);
        }
    } catch (error) {
        console.error("Error cancelling order:", error);
        alert("An error occurred while cancelling the order.");
    }
}

async function cancelAllOrders() {
    const token = localStorage.getItem("jwt");

    try {
        const response = await fetch(`http://localhost:8000/trades/cancel-all/${selectedWalletId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert("All orders cancelled successfully!");
            fetchWalletState(selectedWalletId, token);
        } else {
            const error = await response.json();
            alert(`Failed to cancel all orders: ${error.detail}`);
        }
    } catch (error) {
        console.error("Error cancelling all orders:", error);
        alert("An error occurred while cancelling all orders.");
    }
}

function displayPositions(positions) {
    const positionList = document.getElementById("position-list");
    positionList.innerHTML = "";
    if (positions.length === 0) {
        positionList.innerHTML = "<p>No open positions.</p>";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Symbol</th>
                <th>Size</th>
                <th>Entry Price</th>
                <th>P&L</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector("tbody");

    positions.forEach(position => {
        const row = tbody.insertRow();
        const position_info = position.position;
        row.insertCell(0).textContent = position_info.coin;
        row.insertCell(1).textContent = position_info.szi;
        row.insertCell(2).textContent = position_info.entryPx ? parseFloat(position_info.entryPx).toFixed(2) : "N/A";
        row.insertCell(3).textContent = position.unrealizedPnl;
    });

    positionList.appendChild(table);
}

async function fetchOrderHistory(walletId, token) {
    try {
        const response = await fetch(`http://localhost:8000/wallets/${walletId}/order-history`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            displayOrderHistory(data);
        } else {
            throw new Error("Failed to fetch order history");
        }
    } catch (error) {
        console.error("Error fetching order history:", error);
    }
}

function displayOrderHistory(orders) {
    const orderHistoryList = document.getElementById("order-history-list");
    orderHistoryList.innerHTML = "";
    if (orders.length === 0) {
        orderHistoryList.innerHTML = "<p>No order history.</p>";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Size</th>
                <th>Price</th>
                <th>Status</th>
                <th>Timestamp</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector("tbody");

    orders.forEach(order => {
        const row = tbody.insertRow();
        const order_info = order.order;
        row.insertCell(0).textContent = order_info.coin;
        row.insertCell(1).textContent = order_info.side;
        row.insertCell(2).textContent = order_info.sz;
        row.insertCell(3).textContent = order_info.limitPx;
        row.insertCell(4).textContent = order.status;
        row.insertCell(5).textContent = new Date(order_info.timestamp).toLocaleString();
    });

    orderHistoryList.appendChild(table);
}

async function fetchTradeHistory(walletId, token) {
    try {
        const response = await fetch(`http://localhost:8000/wallets/${walletId}/trade-history`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            displayTradeHistory(data);
        } else {
            throw new Error("Failed to fetch trade history");
        }
    } catch (error) {
        console.error("Error fetching trade history:", error);
    }
}

function displayTradeHistory(trades) {
    const tradeHistoryList = document.getElementById("trade-history-list");
    tradeHistoryList.innerHTML = "";
    if (trades.length === 0) {
        tradeHistoryList.innerHTML = "<p>No trade history.</p>";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Size</th>
                <th>Price</th>
                <th>Fee</th>
                <th>Timestamp</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector("tbody");

    trades.forEach(trade => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = trade.coin;
        row.insertCell(1).textContent = trade.side;
        row.insertCell(2).textContent = trade.sz;
        row.insertCell(3).textContent = trade.px;
        row.insertCell(4).textContent = trade.fee;
        row.insertCell(5).textContent = new Date(trade.time).toLocaleString();
    });

    tradeHistoryList.appendChild(table);
}

async function fetchPortfolioHistory(walletId, token) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (30 * 24 * 60 * 60); // 30 days ago
    try {
        const response = await fetch(`http://localhost:8000/wallets/${walletId}/portfolio-history?start_time=${startTime}&end_time=${endTime}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            renderPortfolioChart(data);
        } else {
            throw new Error("Failed to fetch portfolio history");
        }
    } catch (error) {
        console.error("Error fetching portfolio history:", error);
    }
}

function renderPortfolioChart(history) {
    const chartContainer = document.getElementById('portfolio-chart');
    chartContainer.innerHTML = ''; // Clear previous chart
    const chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
    });

    const lineSeries = chart.addLineSeries();

    const formattedData = history.map(item => ({
        time: item.time,
        value: parseFloat(item.value),
    })).sort((a, b) => a.time - b.time);

    lineSeries.setData(formattedData);
    chart.timeScale().fitContent();
}

function displaySpotBalances(balances) {
    const spotBalancesList = document.getElementById("spot-balances-list");
    spotBalancesList.innerHTML = "";
    if (balances.length === 0) {
        spotBalancesList.innerHTML = "<p>No spot balances.</p>";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Asset</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector("tbody");

    balances.forEach(balance => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = balance.coin;
        row.insertCell(1).textContent = balance.total;
    });

    spotBalancesList.appendChild(table);
}

const fundingRateForm = document.getElementById("funding-rate-form");
fundingRateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const symbol = document.getElementById("funding-symbol").value;
    fetchFundingRateHistory(symbol, localStorage.getItem("jwt"));
});

async function fetchFundingRateHistory(symbol, token) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (30 * 24 * 60 * 60); // 30 days ago
    try {
        const response = await fetch(`http://localhost:8000/market/funding-history?symbol=${symbol}&start_time=${startTime}&end_time=${endTime}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            displayFundingRateHistory(data);
        } else {
            throw new Error("Failed to fetch funding rate history");
        }
    } catch (error) {
        console.error("Error fetching funding rate history:", error);
    }
}

function displayFundingRateHistory(history) {
    const fundingRateHistoryList = document.getElementById("funding-rate-history-list");
    fundingRateHistoryList.innerHTML = "";
    if (history.length === 0) {
        fundingRateHistoryList.innerHTML = "<p>No funding rate history.</p>";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Time</th>
                <th>Funding Rate</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;
    const tbody = table.querySelector("tbody");

    history.forEach(item => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = new Date(item.time).toLocaleString();
        row.insertCell(1).textContent = item.fundingRate;
    });

    fundingRateHistoryList.appendChild(table);
}
