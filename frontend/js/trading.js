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
        initializeChart();
    }

    async function fetchWallets() {
        try {
            const response = await fetch("/wallets/", {
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
            const response = await fetch(`/wallets/${walletId}/open-orders`, {
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
            row.insertCell(4).textContent = order.isSpot ? "Spot" : "Perpetual";

            const actionCell = row.insertCell(5);
            if (!order.isSpot) {
                const modifyButton = document.createElement("button");
                modifyButton.textContent = "Modify";
                modifyButton.addEventListener("click", () => {
                    const newSize = prompt("Enter new size:", order.sz);
                    const newPrice = prompt("Enter new price:", order.limitPx);
                    if (newSize && newPrice) {
                        modifyOrder(order.oid, order.coin, parseFloat(newSize), parseFloat(newPrice));
                    }
                });
                actionCell.appendChild(modifyButton);
            }
        });
    }

    async function modifyOrder(orderId, symbol, newSize, newPrice) {
        const walletId = walletSelector.value;
        const order_type = { "limit": { "tif": "Gtc" } }; // Assuming GTC for simplicity
        try {
            const response = await fetch(`/trades/${orderId}`, {
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
            const response = await fetch(`/wallets/${walletId}/positions`, {
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

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
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
        const timeInForce = document.getElementById("time-in-force").value;
        const tradingMode = tradingModeSelector.value;
        const cloid = uuidv4();

        let order_type = {};
        if (orderType === 'limit') {
            order_type = { "limit": { "tif": timeInForce } };
        } else if (orderType === 'market') {
            order_type = { "market": {} };
        } else if (orderType === 'trigger') {
            const trigger_px = parseFloat(document.getElementById("trigger-price").value);
            order_type = { "trigger": { "trigger_px": trigger_px, "is_market": false, "order_type": { "limit": { "tif": timeInForce } } } };
        }

        const endpoint = tradingMode === 'spot' ? `/trades/spot` : `/trades/`;

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ wallet_id: parseInt(walletId), symbol, is_buy, sz, limit_px, order_type, cloid })
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

    let chart;
    let candlestickSeries;

    function initializeChart() {
        const chartContainer = document.getElementById('price-chart');
        chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: {
                backgroundColor: '#ffffff',
                textColor: 'rgba(0, 0, 0, 0.9)',
            },
            grid: {
                vertLines: {
                    color: 'rgba(197, 203, 206, 0.5)',
                },
                horzLines: {
                    color: 'rgba(197, 203, 206, 0.5)',
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
            },
        });
        candlestickSeries = chart.addCandlestickSeries({
            upColor: 'rgba(0, 150, 136, 1)',
            downColor: 'rgba(255, 82, 82, 1)',
            borderDownColor: 'rgba(255, 82, 82, 1)',
            borderUpColor: 'rgba(0, 150, 136, 1)',
            wickDownColor: 'rgba(255, 82, 82, 1)',
            wickUpColor: 'rgba(0, 150, 136, 1)',
        });
    }

    async function loadChartData(symbol) {
        if (!symbol) return;
        try {
            const now = Math.floor(Date.now());
            const startTime = now - (1000 * 60 * 60 * 24 * 30); // 30 days ago
            const response = await fetch(`/market/candles?symbol=${symbol}&interval=1h&start_time=${startTime}&end_time=${now}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch chart data");
            const data = await response.json();

            const formattedData = data.map(d => ({
                time: d.t / 1000,
                open: parseFloat(d.o),
                high: parseFloat(d.h),
                low: parseFloat(d.l),
                close: parseFloat(d.c),
            }));

            candlestickSeries.setData(formattedData);
        } catch (error) {
            console.error("Error fetching chart data:", error);
        }
    }

    document.getElementById("symbol").addEventListener("change", (e) => {
        loadChartData(e.target.value);
        loadDepthChart(e.target.value);
    });

    let depthChart;
    let bidSeries;
    let askSeries;

    function initializeDepthChart() {
        const chartContainer = document.getElementById('depth-chart');
        depthChart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: {
                backgroundColor: '#ffffff',
                textColor: 'rgba(0, 0, 0, 0.9)',
            },
            grid: {
                vertLines: {
                    color: 'rgba(197, 203, 206, 0.5)',
                },
                horzLines: {
                    color: 'rgba(197, 203, 206, 0.5)',
                },
            },
        });
        bidSeries = depthChart.addAreaSeries({
            topColor: 'rgba(38, 166, 154, 0.28)',
            bottomColor: 'rgba(38, 166, 154, 0.05)',
            lineColor: 'rgba(38, 166, 154, 1)',
            lineWidth: 2,
        });
        askSeries = depthChart.addAreaSeries({
            topColor: 'rgba(239, 83, 80, 0.28)',
            bottomColor: 'rgba(239, 83, 80, 0.05)',
            lineColor: 'rgba(239, 83, 80, 1)',
            lineWidth: 2,
        });
    }

    async function loadDepthChart(symbol) {
        if (!symbol) return;
        try {
            const response = await fetch(`/market/depth?symbol=${symbol}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch depth chart data");
            const data = await response.json();

            const bids = data.levels[0].map(level => ({ time: parseFloat(level.px), value: parseFloat(level.sz) }));
            const asks = data.levels[1].map(level => ({ time: parseFloat(level.px), value: parseFloat(level.sz) }));

            bidSeries.setData(bids);
            askSeries.setData(asks);
        } catch (error) {
            console.error("Error fetching depth chart data:", error);
        }
    }

    initializeDepthChart();

    chart.subscribeClick(param => {
        const price = param.seriesPrices.get(candlestickSeries);
        if (price) {
            document.getElementById('price').value = price.close || price.value;
        }
    });

    chart.subscribeCrosshairMove(param => {
        const price = param.seriesPrices.get(candlestickSeries);
        if (price) {
            // You could update a live price display here if you had one
        }
    });

    initialize();
    loadChartData(document.getElementById("symbol").value); // Initial load
});
