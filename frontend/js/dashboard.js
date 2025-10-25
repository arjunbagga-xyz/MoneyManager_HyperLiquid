document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "login.html"; // Redirect to the new login page
        return;
    }

    let selectedAddress = null;
    let selectedIsMaster = false;
    let ws = null;

    // The 'activeWalletChanged' event from shared.js will trigger the initial data load
    document.addEventListener('activeWalletChanged', (event) => {
        const walletAddress = event.detail.walletAddress;
        if (walletAddress) {
            handleWalletSelection(walletAddress, true, token); // Assume master wallet on global change
        }
    });

    // Tab switching for trading activity
    const tabs = document.querySelectorAll(".tabs .tab-link");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(item => item.classList.remove("active"));
            tab.classList.add("active");

            document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Cancel All button
    const cancelAllBtn = document.getElementById('cancel-all-btn');
    if(cancelAllBtn) {
        cancelAllBtn.addEventListener('click', () => {
             if(selectedAddress && selectedIsMaster) {
                cancelAllOrders(selectedAddress, token);
             } else {
                alert("Order cancellation is only supported for master wallets.");
             }
        });
    }
});

function handleWalletSelection(walletAddress, isMaster, token) {
    selectedAddress = walletAddress;
    selectedIsMaster = isMaster;

    // Update UI to show which wallet is selected
    document.querySelectorAll('.master-wallet, .subaccount').forEach(el => el.classList.remove('active'));
    const element = document.querySelector(`[data-wallet-address="${walletAddress}"]`);
    if (element) {
        element.classList.add('active');
    }

    document.getElementById("dashboard-title").textContent = isMaster ? "Consolidated Dashboard" : `Subaccount: ${walletAddress.substring(0, 8)}...`;

    if (isMaster) {
        fetchConsolidatedState(walletAddress, token);
    } else {
        fetchAddressState(walletAddress, token);
        document.getElementById("total-account-value").textContent = ""; // Hide total for subaccounts
    }

    // These histories are fetched for both master and subaccounts
    fetchOrderHistory(walletAddress, token);
    fetchTradeHistory(walletAddress, token);
    fetchPortfolioHistory(walletAddress, token);
    initializeWebSocket(walletAddress, token);
}


async function fetchConsolidatedState(walletAddress, token) {
    try {
        const response = await fetch(`/wallets/${walletAddress}/consolidated-state`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            displayOrders(data.open_orders, walletAddress, token);
            displayPositions(data.positions);
            displaySpotBalances(data.spot_balances);
            document.getElementById("total-account-value").textContent = `Total Account Value: ${data.total_account_value.toFixed(2)} USDC`;
        } else {
            console.error("Failed to fetch consolidated state");
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
            displayOrders(data.open_orders, walletAddress, token);
            displayPositions(data.positions);
            displaySpotBalances(data.spot_balances);
        } else {
            console.error("Failed to fetch wallet state");
        }
    } catch (error) {
        console.error("Error fetching wallet state:", error);
    }
}

function displayOrders(orders, walletAddress, token) {
    const container = document.getElementById("order-list");
    container.innerHTML = "";
    if (!orders || orders.length === 0) {
        container.innerHTML = "<p>No open orders.</p>";
        return;
    }

    const table = createTable(["Symbol", "Side", "Size", "Price", "Type", "Timestamp", "Action"]);
    const tbody = table.querySelector("tbody");

    orders.forEach(order => {
        const order_info = order.order;
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${order_info.coin}</td>
            <td>${order_info.side}</td>
            <td>${order_info.sz}</td>
            <td>${order_info.limitPx}</td>
            <td>${order_info.trigger ? "Trigger" : "Limit/Market"}</td>
            <td>${new Date(order_info.timestamp).toLocaleString()}</td>
        `;
        const actionCell = row.insertCell(6);
        if(selectedIsMaster){
            const cancelButton = document.createElement("button");
            cancelButton.textContent = "Cancel";
            cancelButton.className = "button-danger small";
            cancelButton.onclick = () => cancelOrder(order_info.coin, order_info.oid, walletAddress, token);
            actionCell.appendChild(cancelButton);
        }
    });
    container.appendChild(table);
}

async function cancelOrder(symbol, oid, walletAddress, token) {
    try {
        const response = await fetch(`/trades/cancel`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ wallet_address: walletAddress, symbol, oid: parseInt(oid) })
        });
        if (response.ok) {
            alert("Order cancelled!");
            handleWalletSelection(walletAddress, selectedIsMaster, token); // Refresh data
        } else {
            const error = await response.json();
            alert(`Failed to cancel order: ${error.detail}`);
        }
    } catch (error) {
        alert("An error occurred while cancelling the order.");
    }
}

async function cancelAllOrders(walletAddress, token) {
    try {
        const response = await fetch(`/trades/cancel-all/${walletAddress}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
            alert("All orders cancelled!");
            handleWalletSelection(walletAddress, selectedIsMaster, token); // Refresh data
        } else {
            const error = await response.json();
            alert(`Failed to cancel all orders: ${error.detail}`);
        }
    } catch (error) {
        alert("An error occurred while cancelling all orders.");
    }
}

function displayPositions(positions) {
    const container = document.getElementById("position-list");
    container.innerHTML = "";
     if (!positions || positions.length === 0) {
        container.innerHTML = "<p>No open positions.</p>";
        return;
    }
    const table = createTable(["Symbol", "Size", "Entry Price", "P&L"]);
    const tbody = table.querySelector("tbody");
    positions.forEach(pos => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${pos.position.coin}</td>
            <td>${pos.position.szi}</td>
            <td>${parseFloat(pos.position.entryPx).toFixed(2)}</td>
            <td>${pos.unrealizedPnl}</td>
        `;
    });
    container.appendChild(table);
}

function displaySpotBalances(balances) {
    const container = document.getElementById("spot-balances");
    container.innerHTML = "";
    if (!balances || balances.length === 0) {
        container.innerHTML = "<p>No spot balances.</p>";
        return;
    }
    const table = createTable(["Asset", "Total"]);
    const tbody = table.querySelector("tbody");
    balances.forEach(balance => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${balance.coin}</td><td>${balance.total}</td>`;
    });
    container.appendChild(table);
}

async function fetchOrderHistory(walletAddress, token) {
    const container = document.getElementById("order-history");
    try {
        const response = await fetch(`/wallets/order-history/${walletAddress}`, { headers: { "Authorization": `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            container.innerHTML = "";
            if (!data || data.length === 0) {
                container.innerHTML = "<p>No order history.</p>";
                return;
            }
            const table = createTable(["Symbol", "Side", "Size", "Price", "Status", "Timestamp"]);
            const tbody = table.querySelector("tbody");
            data.forEach(order => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${order.order.coin}</td>
                    <td>${order.order.side}</td>
                    <td>${order.order.sz}</td>
                    <td>${order.order.limitPx}</td>
                    <td>${order.status}</td>
                    <td>${new Date(order.order.timestamp).toLocaleString()}</td>
                `;
            });
            container.appendChild(table);
        }
    } catch (error) { console.error("Error fetching order history:", error); }
}

async function fetchTradeHistory(walletAddress, token) {
    const container = document.getElementById("trade-history");
    try {
        const response = await fetch(`/wallets/trade-history/${walletAddress}`, { headers: { "Authorization": `Bearer ${token}` } });
        if (response.ok) {
            const data = await response.json();
            container.innerHTML = "";
            if (!data || data.length === 0) {
                container.innerHTML = "<p>No trade history.</p>";
                return;
            }
            const table = createTable(["Symbol", "Side", "Size", "Price", "Fee", "Timestamp"]);
            const tbody = table.querySelector("tbody");
            data.forEach(trade => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${trade.coin}</td>
                    <td>${trade.side}</td>
                    <td>${trade.sz}</td>
                    <td>${trade.px}</td>
                    <td>${trade.fee}</td>
                    <td>${new Date(trade.time).toLocaleString()}</td>
                `;
            });
            container.appendChild(table);
        }
    } catch (error) { console.error("Error fetching trade history:", error); }
}

let portfolioChart = null; // Keep a reference to the chart
async function fetchPortfolioHistory(walletAddress, token) {
    const chartContainer = document.getElementById('portfolio-chart');
    try {
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (30 * 24 * 60 * 60); // 30 days
        const response = await fetch(`/wallets/portfolio-history/${walletAddress}?start_time=${startTime}&end_time=${endTime}`, { headers: { "Authorization": `Bearer ${token}` } });

        if (portfolioChart) {
            portfolioChart.remove();
            portfolioChart = null;
        }

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                 portfolioChart = LightweightCharts.createChart(chartContainer, {
                    width: chartContainer.clientWidth,
                    height: chartContainer.clientHeight,
                    layout: { backgroundColor: 'var(--background-light)', textColor: 'var(--text-secondary)' },
                    grid: { vertLines: { color: 'var(--border-color)' }, horzLines: { color: 'var(--border-color)' } },
                });
                const lineSeries = portfolioChart.addLineSeries({ color: 'var(--primary-color)' });
                const formattedData = data.map(item => ({ time: item.time, value: parseFloat(item.value) })).sort((a, b) => a.time - b.time);
                lineSeries.setData(formattedData);
                portfolioChart.timeScale().fitContent();
            } else {
                 chartContainer.innerHTML = "<p>No portfolio history available.</p>";
            }
        }
    } catch (error) { console.error("Error fetching portfolio history:", error); }
}

function initializeWebSocket(walletAddress, token) {
    // WebSocket logic here, to refresh data.
    // ...
}

function createTable(headers) {
    const table = document.createElement("table");
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    headers.forEach(headerText => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    table.appendChild(document.createElement("tbody"));
    return table;
}
