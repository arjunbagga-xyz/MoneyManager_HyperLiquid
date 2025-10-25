
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // State management
    let activeWalletAddress = null;
    let selectedCoin = 'BTC'; // Default coin
    let ws = null;

    // Element references
    const assetSelector = document.getElementById('asset-selector');
    const assetPrice = document.getElementById('asset-price');
    const assetChange = document.getElementById('asset-change');
    const chartContainer = document.getElementById('trading-chart');
    const orderBookContent = document.getElementById('order-book-content');
    const orderForm = document.getElementById('order-form');

    // Chart instance
    let chart = null;
    let candlestickSeries = null;

    // --- INITIALIZATION ---
    function initialize() {
        initializeChart();
        initializeAssetSelector();
        initializeOrderForm();
        initializeActivityTabs();

        document.addEventListener('activeWalletChanged', (event) => {
            activeWalletAddress = event.detail.walletAddress;
            if (activeWalletAddress) {
                // Fetch data that depends on the wallet
                fetchPositions(activeWalletAddress);
                fetchOpenOrders(activeWalletAddress);
            }
        });

        // Initial data load for the default coin
        updateTradingData(selectedCoin);
    }

    // --- UI INITIALIZATION ---
    function initializeChart() {
        chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: { backgroundColor: 'var(--background-light)', textColor: 'var(--text-secondary)' },
            grid: { vertLines: { color: 'var(--border-color)' }, horzLines: { color: 'var(--border-color)' } },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            timeScale: { borderColor: 'var(--border-color)' },
        });
        candlestickSeries = chart.addCandlestickSeries({
            upColor: 'var(--success-color)', downColor: 'var(--error-color)',
            borderDownColor: 'var(--error-color)', borderUpColor: 'var(--success-color)',
            wickDownColor: 'var(--error-color)', wickUpColor: 'var(--success-color)',
        });

        chart.subscribeClick(param => {
            const price = param.seriesPrices.get(candlestickSeries);
            if (price) {
                document.getElementById('order-price').value = price.close || price.value;
            }
        });
    }

    async function initializeAssetSelector() {
        try {
            const response = await fetch('/market/meta', { headers: { "Authorization": `Bearer ${token}` } });
            const meta = await response.json();
            const universe = meta[0]?.universe || [];

            universe.forEach(asset => {
                const option = document.createElement('option');
                option.value = asset.name;
                option.textContent = asset.name;
                assetSelector.appendChild(option);
            });
            assetSelector.value = selectedCoin;

            assetSelector.addEventListener('change', () => {
                selectedCoin = assetSelector.value;
                updateTradingData(selectedCoin);
            });
        } catch (error) {
            console.error("Error initializing asset selector:", error);
        }
    }

    function initializeOrderForm() {
        const tabs = orderForm.querySelectorAll('.tabs .tab-link');
        const sideButtons = orderForm.querySelectorAll('.side-button');
        const tradeButton = orderForm.querySelector('.trade-button');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('limit-price-group').style.display = tab.dataset.orderType === 'limit' ? 'block' : 'none';
                document.getElementById('trigger-price-group').style.display = tab.dataset.orderType === 'trigger' ? 'block' : 'none';
            });
        });

        sideButtons.forEach(button => {
            button.addEventListener('click', () => {
                sideButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                tradeButton.className = `button-primary trade-button ${button.dataset.side}`;
            });
        });

        orderForm.addEventListener('submit', handleOrderSubmit);
    }

    function initializeActivityTabs() {
        const tabs = document.querySelectorAll('.grid-activity .tabs .tab-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.grid-activity .tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    }

    // --- DATA FETCHING & UPDATING ---
    function updateTradingData(coin) {
        fetchChartData(coin);
        initializeWebSocket(coin); // WebSocket provides order book and price updates
    }

    async function fetchChartData(coin) {
        try {
            const now = Date.now();
            const startTime = now - (1000 * 60 * 60 * 24 * 30); // 30 days ago
            const response = await fetch(`/market/candles?symbol=${coin}&interval=1h&start_time=${startTime}&end_time=${now}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            const formattedData = data.map(d => ({
                time: d.t / 1000, open: parseFloat(d.o), high: parseFloat(d.h), low: parseFloat(d.l), close: parseFloat(d.c),
            }));
            candlestickSeries.setData(formattedData);
        } catch (error) {
            console.error("Error fetching chart data:", error);
        }
    }

    function initializeWebSocket(coin) {
        if (ws) ws.close();

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Using the public market data websocket
        ws = new WebSocket(`${wsProtocol}//api.hyperliquid.xyz/ws`);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                method: "subscribe",
                subscription: { type: "l2Book", coin: coin }
            }));
             ws.send(JSON.stringify({
                method: "subscribe",
                subscription: { type: "trades", coin: coin }
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.channel === 'l2Book') {
                updateOrderBook(data.data);
            }
             if (data.channel === 'trades') {
                updatePriceDisplay(data.data);
            }
        };

        ws.onerror = (error) => console.error("WebSocket error:", error);
    }

    function updateOrderBook(data) {
        const { levels } = data;
        const asksContainer = document.getElementById('order-book-asks');
        const bidsContainer = document.getElementById('order-book-bids');
        const midPriceContainer = document.getElementById('order-book-mid-price');

        asksContainer.innerHTML = levels[1].slice(0, 10).map(ask => `<div class="order-book-row"><span class="price">${parseFloat(ask.px).toFixed(2)}</span><span class="size">${ask.sz}</span></div>`).join('');
        bidsContainer.innerHTML = levels[0].slice(0, 10).map(bid => `<div class="order-book-row"><span class="price">${parseFloat(bid.px).toFixed(2)}</span><span class="size">${bid.sz}</span></div>`).join('');

        const midPrice = (parseFloat(levels[0][0].px) + parseFloat(levels[1][0].px)) / 2;
        midPriceContainer.textContent = midPrice.toFixed(2);
    }

    let lastPrice = 0;
    function updatePriceDisplay(trades) {
         if (trades.length > 0) {
            const latestTrade = trades[trades.length - 1];
            const currentPrice = parseFloat(latestTrade.px);

            assetPrice.textContent = currentPrice.toFixed(2);
            if(lastPrice !== 0) {
                const change = currentPrice - lastPrice;
                assetChange.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}`;
                assetChange.className = `change-display ${change >= 0 ? 'positive' : 'negative'}`;
            }
            lastPrice = currentPrice;
        }
    }

    async function fetchPositions(walletAddress) {
        const container = document.getElementById('positions');
        container.innerHTML = '';
        try {
            const response = await fetch(`/wallets/state/${walletAddress}`, { headers: { "Authorization": `Bearer ${token}` } });
            const data = await response.json();
            if (data.positions && data.positions.length > 0) {
                const table = createTable(["Symbol", "Size", "Entry Price", "P&L"]);
                const tbody = table.querySelector("tbody");
                data.positions.forEach(p => {
                    const row = tbody.insertRow();
                    row.innerHTML = `<td>${p.position.coin}</td><td>${p.position.szi}</td><td>${parseFloat(p.position.entryPx).toFixed(2)}</td><td>${p.unrealizedPnl}</td>`;
                });
                container.appendChild(table);
            } else {
                container.innerHTML = "<p>No open positions.</p>";
            }
        } catch (error) {
            console.error("Error fetching positions:", error);
            container.innerHTML = "<p>Error loading positions.</p>";
        }
    }

    async function fetchOpenOrders(walletAddress) {
        const container = document.getElementById('orders');
        container.innerHTML = '';
        try {
            const response = await fetch(`/wallets/state/${walletAddress}`, { headers: { "Authorization": `Bearer ${token}` } });
            const data = await response.json();
            if (data.open_orders && data.open_orders.length > 0) {
                 const table = createTable(["Symbol", "Side", "Size", "Price", "Action"]);
                 const tbody = table.querySelector("tbody");
                 data.open_orders.forEach(o => {
                    const row = tbody.insertRow();
                    row.innerHTML = `<td>${o.order.coin}</td><td>${o.order.side}</td><td>${o.order.sz}</td><td>${o.order.limitPx}</td>`;
                    const actionCell = row.insertCell(4);
                    const cancelButton = document.createElement("button");
                    cancelButton.textContent = "Cancel";
                    cancelButton.className = "button-danger small";
                    // cancelButton.onclick = () => cancelOrder(...); // TODO
                    actionCell.appendChild(cancelButton);
                 });
                 container.appendChild(table);
            } else {
                container.innerHTML = "<p>No open orders.</p>";
            }
        } catch (error) {
            console.error("Error fetching open orders:", error);
            container.innerHTML = "<p>Error loading open orders.</p>";
        }
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

    async function handleOrderSubmit(e) {
        e.preventDefault();
        if (!activeWalletAddress) {
            alert("Please select an active wallet.");
            return;
        }

        const sideButton = orderForm.querySelector('.side-button.active');
        const orderTypeTab = orderForm.querySelector('.tabs .tab-link.active');

        const order = {
            symbol: selectedCoin,
            is_buy: sideButton.dataset.side === 'buy',
            sz: parseFloat(document.getElementById('order-size').value),
            limit_px: parseFloat(document.getElementById('order-price').value),
            order_type: {},
            cloid: crypto.randomUUID()
        };

        const orderTypeName = orderTypeTab.dataset.orderType;
        if (orderTypeName === 'limit') {
            order.order_type = { "limit": { "tif": "Gtc" } };
        } else if (orderTypeName === 'market') {
            order.order_type = { "market": {} };
        } else if (orderTypeName === 'trigger') {
            const trigger_px = parseFloat(document.getElementById("trigger-price").value);
            order.order_type = { "trigger": { "trigger_px": trigger_px, "is_market": false, "order_type": { "limit": { "tif": "Gtc" } } } };
        }

        try {
            const response = await fetch('/trades/', {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    wallet_address: activeWalletAddress,
                    ...order
                })
            });
             const result = await response.json();
            if (response.ok) {
                alert(`Order submitted successfully!`);
                fetchOpenOrders(activeWalletAddress);
            } else {
                alert(`Order failed: ${result.detail}`);
            }
        } catch (error) {
            console.error("Order submission error:", error);
            alert("An error occurred while placing the order.");
        }
    }

    // --- START THE APP ---
    initialize();
});
