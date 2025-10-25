
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        // This is handled by shared.js, but as a fallback:
        window.location.href = "login.html";
        return;
    }

    // Use the global wallet ready function
    onWalletReady(wallet => {
        if (wallet) {
            initializeDashboardForWallet(wallet, token);
        } else {
            document.getElementById("wallet-list").innerHTML = "<p>No wallet selected. Please select a wallet from the dropdown.</p>";
        }
    });

    // Also, display a list of all wallets
    fetchAllWalletsOverview(token);
});

// New function to initialize the dashboard for the SELECED wallet
async function initializeDashboardForWallet(wallet, token) {
    document.getElementById("total-account-value").style.display = 'block';

    // Fetch all data for the selected master wallet
    fetchConsolidatedState(wallet.address, token);
    fetchOrderHistory(wallet.address, token);
    fetchTradeHistory(wallet.address, token);
    fetchPortfolioHistory(wallet.address, token);
    initializeWebSocket(wallet.address);
}

// New function to fetch and display a simple list of ALL wallets
async function fetchAllWalletsOverview(token) {
    const walletListDiv = document.getElementById("wallet-list");
    try {
        const wallets = await fetchWallets(token);
        if (wallets.length === 0) {
            walletListDiv.innerHTML = "<p>No wallets found. Add one on the Account page.</p>";
            return;
        }

        const ul = document.createElement("ul");
        for (const wallet of wallets) {
            const li = document.createElement("li");
            // Fetch balance for each wallet
            const balanceResponse = await fetch(`/wallets/${wallet.address}/balance`, {
                 headers: { "Authorization": `Bearer ${token}` }
            });
            const balanceData = await balanceResponse.json();
            const balance = parseFloat(balanceData.balance).toFixed(2);

            li.textContent = `${wallet.name} (${wallet.address.substring(0, 6)}...): ${balance} USDC`;
            ul.appendChild(li);
        }
        walletListDiv.innerHTML = "";
        walletListDiv.appendChild(ul);

    } catch (error) {
        console.error("Error fetching all wallets overview:", error);
        walletListDiv.innerHTML = "<p>Error loading wallet list.</p>";
    }
}

async function fetchWallets(token) {
    const response = await fetch("/wallets/", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (response.status === 401) {
        window.location.href = "account.html";
        return [];
    }
    if (!response.ok) {
        throw new Error("Failed to fetch wallets");
    }
    return response.json();
}

async function fetchSubaccountsForWallets(wallets, token) {
    for (const wallet of wallets) {
        const response = await fetch(`/wallets/${wallet.address}/subaccounts`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            wallet.subaccounts = await response.json();
        } else {
            wallet.subaccounts = [];
        }
    }
    return wallets;
}

async function fetchConsolidatedState(walletAddress, token) {
    try {
        const response = await fetch(`/wallets/${walletAddress}/consolidated-state`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            displayOrders(data.open_orders);
            displayPositions(data.positions);
            displaySpotBalances(data.spot_balances);
            document.getElementById("total-account-value").textContent = `Total Account Value: ${data.total_account_value.toFixed(2)} USDC`;
        } else {
            throw new Error("Failed to fetch consolidated state");
        }
    } catch (error) {
        console.error("Error fetching consolidated state:", error);
    }
}

async function fetchAddressState(walletAddress, token) {
    try {
        const response = await fetch(`/wallets/state/${walletAddress}`, {
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

// ... (displayOrders, displayPositions, displaySpotBalances remain the same)
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
    if (!selectedWalletId) {
        alert("Order cancellation is only supported for master wallets.");
        return;
    }
    const oid = event.target.dataset.oid;
    const symbol = event.target.dataset.symbol;
    const token = localStorage.getItem("jwt");

    try {
        const response = await fetch(`/trades/cancel`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                wallet_address: selectedAddress,
                symbol: symbol,
                oid: parseInt(oid)
            })
        });

        if (response.ok) {
            alert("Order cancelled successfully!");
            if (document.getElementById("total-account-value").style.display === 'block') {
                fetchConsolidatedState(selectedAddress, localStorage.getItem("jwt"));
            } else {
                fetchAddressState(selectedAddress, localStorage.getItem("jwt"));
            }
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
    if (!selectedWalletId) {
        alert("Order cancellation is only supported for master wallets.");
        return;
    }
    const token = localStorage.getItem("jwt");

    try {
        const response = await fetch(`/trades/cancel-all/${selectedAddress}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert("All orders cancelled successfully!");
            if (document.getElementById("total-account-value").style.display === 'block') {
                fetchConsolidatedState(selectedAddress, localStorage.getItem("jwt"));
            } else {
                fetchAddressState(selectedAddress, localStorage.getItem("jwt"));
            }
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


async function fetchOrderHistory(walletAddress, token) {
    try {
        const response = await fetch(`/wallets/order-history/${walletAddress}`, {
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
// ... (displayOrderHistory remains the same)
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

async function fetchTradeHistory(walletAddress, token) {
    try {
        const response = await fetch(`/wallets/trade-history/${walletAddress}`, {
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
// ... (displayTradeHistory remains the same)
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


async function fetchPortfolioHistory(walletAddress, token) {
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (30 * 24 * 60 * 60); // 30 days ago
    try {
        const response = await fetch(`/wallets/portfolio-history/${walletAddress}?start_time=${startTime}&end_time=${endTime}`, {
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

// ... (renderPortfolioChart remains the same)
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


function initializeWebSocket(walletAddress) {
    if (ws) {
        ws.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/updates/${walletAddress}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log("WebSocket connection established");
    ws.onmessage = (event) => {
        console.log("WebSocket message received:", JSON.parse(event.data));
        // Refresh the currently selected view
        if (selectedAddress) {
            if (document.getElementById("total-account-value").style.display === 'block') {
                fetchConsolidatedState(selectedAddress, localStorage.getItem("jwt"));
            } else {
                fetchAddressState(selectedAddress, localStorage.getItem("jwt"));
            }
            showNotification("Your wallet data has been updated!");
        }
    };
    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.log("WebSocket connection closed");
}

function showNotification(message) {
    if (Notification.permission === "granted") {
        new Notification(message);
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(message);
            }
        });
    }
}

const fundingRateForm = document.getElementById("funding-rate-form");
fundingRateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const symbol = document.getElementById("funding-symbol").value;
    fetchFundingRateHistory(symbol, localStorage.getItem("jwt"));
});

async function fetchFundingRateHistory(symbol, token) {
    // This endpoint in the SDK requires millisecond timestamps
    const endTime = Date.now();
    const startTime = endTime - (30 * 24 * 60 * 60 * 1000); // 30 days ago in ms
    try {
        const response = await fetch(`/market/funding-history?symbol=${symbol}&start_time=${startTime}&end_time=${endTime}`, {
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
