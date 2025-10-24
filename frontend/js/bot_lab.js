document.addEventListener("DOMContentLoaded", () => {
    const createBotForm = document.getElementById("create-bot-form");
    const botMessage = document.getElementById("bot-message");
    const botList = document.getElementById("bot-list");
    const token = localStorage.getItem("jwt");

    const modal = document.getElementById("run-bot-modal");
    const runBotForm = document.getElementById("run-bot-form");
    const runBotMessage = document.getElementById("run-bot-message");
    const closeModal = document.getElementsByClassName("close-button")[0];

    const dashboardModal = document.getElementById("bot-dashboard-modal");
    const closeDashboardModal = document.getElementsByClassName("close-dashboard-button")[0];
    let dashboardWs = null;

    let bots = [];
    let wallets = [];
    let currentBotId = null;

    if (!token) {
        window.location.href = "account.html";
        return;
    }

    // --- Modal Logic ---
    closeModal.onclick = function() {
        modal.style.display = "none";
    }
    closeDashboardModal.onclick = function() {
        dashboardModal.style.display = "none";
        if (dashboardWs) {
            dashboardWs.close();
        }
    }
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
        if (event.target == dashboardModal) {
            dashboardModal.style.display = "none";
            if (dashboardWs) {
                dashboardWs.close();
            }
        }
    }

    async function openRunBotModal(botId) {
        currentBotId = botId;
        const bot = bots.find(b => b.id === botId);
        document.getElementById("run-bot-name").textContent = bot.name;

        const walletSelector = document.getElementById("run-wallet-selector");
        walletSelector.innerHTML = "";
        wallets.forEach(wallet => {
            const option = document.createElement("option");
            option.value = wallet.id;
            option.textContent = `${wallet.name} - ${wallet.address}`;
            walletSelector.appendChild(option);
        });

        const runtimeInputsContainer = document.getElementById("runtime-inputs");
        runtimeInputsContainer.innerHTML = "";
        if (bot.input_schema) {
            for (const key in bot.input_schema) {
                const label = document.createElement("label");
                label.textContent = `${key}:`;
                const input = document.createElement("input");
                input.type = "text";
                input.id = `runtime-input-${key}`;
                input.name = key;
                runtimeInputsContainer.appendChild(label);
                runtimeInputsContainer.appendChild(input);
                runtimeInputsContainer.appendChild(document.createElement("br"));
            }
        }

        modal.style.display = "block";
    }

    function openDashboardModal(botId) {
        const bot = bots.find(b => b.id === botId);
        document.getElementById("dashboard-bot-name").textContent = bot.name;

        const logContent = document.getElementById("bot-log-content");
        const statusContent = document.getElementById("bot-status-content");
        logContent.textContent = "";
        statusContent.textContent = "Connecting...";

        dashboardModal.style.display = "block";

        const wsUrl = `ws://localhost:8000/ws/bots/${botId}/dashboard`;
        dashboardWs = new WebSocket(wsUrl);

        dashboardWs.onmessage = function(event) {
            const message = JSON.parse(event.data);
            if (message.type === 'log') {
                logContent.textContent += message.data + '\n';
            } else if (message.type === 'status') {
                statusContent.textContent = JSON.stringify(message.data, null, 2);
            }
        };

        dashboardWs.onclose = function() {
            statusContent.textContent = "Connection closed.";
        };

        dashboardWs.onerror = function(error) {
            statusContent.textContent = "An error occurred.";
            console.error("WebSocket Error:", error);
        };
    }

    // --- Main Page Logic ---
    fetchWallets();
    fetchBots();

    createBotForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("bot-name").value;
        const code = document.getElementById("bot-code").value;
        const schemaText = document.getElementById("bot-schema").value;
        let input_schema = null;

        try {
            if (schemaText) {
                input_schema = JSON.parse(schemaText);
            }

            const response = await fetch("http://localhost:8000/bots/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ name, code, input_schema }),
            });

            if (response.ok) {
                botMessage.textContent = "Bot saved successfully!";
                botMessage.style.color = "green";
                createBotForm.reset();
                fetchBots();
            } else {
                const error = await response.json();
                botMessage.textContent = `Error saving bot: ${error.detail}`;
                botMessage.style.color = "red";
            }
        } catch (error) {
            botMessage.textContent = "An error occurred. Please check if the schema is valid JSON.";
            botMessage.style.color = "red";
        }
    });

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

    async function fetchBots() {
        try {
            const response = await fetch("http://localhost:8000/bots/", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch bots");
            const botsData = await response.json();
            displayBots(botsData);
        } catch (error) {
            botList.innerHTML = "<p>Could not load bots.</p>";
        }
    }

    function displayBots(botsData) {
        bots = botsData;
        botList.innerHTML = "";
        if (bots.length === 0) {
            botList.innerHTML = "<p>No bots created yet.</p>";
            return;
        }

        const ul = document.createElement("ul");
        bots.forEach(bot => {
            const li = document.createElement("li");
            li.textContent = bot.name;

            const runButton = document.createElement("button");
            runButton.textContent = "Run";
            runButton.onclick = () => openRunBotModal(bot.id);
            li.appendChild(runButton);

            const stopButton = document.createElement("button");
            stopButton.textContent = "Stop";
            stopButton.onclick = () => stopBot(bot.id);
            li.appendChild(stopButton);

            const dashboardButton = document.createElement("button");
            dashboardButton.textContent = "View Dashboard";
            dashboardButton.onclick = () => openDashboardModal(bot.id);
            li.appendChild(dashboardButton);

            ul.appendChild(li);
        });
        botList.appendChild(ul);
    }

    runBotForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const wallet_id = parseInt(document.getElementById("run-wallet-selector").value);
        const capital_allocation = parseFloat(document.getElementById("capital-allocation").value);

        const runtime_inputs = {};
        const bot = bots.find(b => b.id === currentBotId);
        if (bot.input_schema) {
            for (const key in bot.input_schema) {
                runtime_inputs[key] = document.getElementById(`runtime-input-${key}`).value;
            }
        }

        try {
            const response = await fetch(`http://localhost:8000/bots/${currentBotId}/run`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ wallet_id, capital_allocation, runtime_inputs }),
            });

            if (response.ok) {
                runBotMessage.textContent = "Bot started successfully!";
                runBotMessage.style.color = "green";
                setTimeout(() => modal.style.display = "none", 1000);
            } else {
                const error = await response.json();
                runBotMessage.textContent = `Error: ${error.detail}`;
                runBotMessage.style.color = "red";
            }
        } catch (error) {
            runBotMessage.textContent = "An error occurred.";
            runBotMessage.style.color = "red";
        }
    });

    async function stopBot(botId) {
        try {
            const response = await fetch(`http://localhost:8000/bots/${botId}/stop`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
            });
            if (response.ok) {
                alert("Bot stopped successfully!");
            } else {
                const error = await response.json();
                alert(`Error stopping bot: ${error.detail}`);
            }
        } catch (error) {
            alert("An error occurred while stopping the bot.");
        }
    }
});
