document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // --- STATE ---
    let bots = [];
    let activeBotId = null;
    let activeWalletAddress = null;

    // --- CODEMIRROR EDITORS ---
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('bot-code'), {
        mode: 'python',
        theme: 'darcula',
        lineNumbers: true,
        lineWrapping: true,
    });
    const schemaEditor = CodeMirror.fromTextArea(document.getElementById('bot-schema'), {
        mode: { name: 'javascript', json: true },
        theme: 'darcula',
        lineNumbers: true,
    });

    // --- ELEMENT SELECTORS ---
    const botList = document.getElementById('bot-list');
    const editorForm = document.getElementById('bot-editor-form');
    const newBotBtn = document.getElementById('new-bot-btn');
    const editorTitle = document.getElementById('editor-title');
    const botNameInput = document.getElementById('bot-name');
    const botIdInput = document.getElementById('bot-id');

    // --- INITIALIZATION ---
    function initialize() {
        initializeTabs();
        fetchBots();

        document.addEventListener('activeWalletChanged', e => activeWalletAddress = e.detail.walletAddress);

        newBotBtn.addEventListener('click', clearEditorAndSelect);
        editorForm.addEventListener('submit', handleSaveBot);
    }

    function initializeTabs() {
        const tabs = document.querySelectorAll('.main-tabs .tab-link');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    }

    // --- BOT LIBRARY LOGIC ---
    async function fetchBots() {
        try {
            const response = await fetch("/bots/", { headers: { "Authorization": `Bearer ${token}` } });
            bots = await response.json();
            renderBotList();
        } catch (error) {
            console.error("Error fetching bots:", error);
        }
    }

    function renderBotList() {
        botList.innerHTML = '';
        if (bots.length === 0) {
            botList.innerHTML = '<p>No bots created yet.</p>';
        } else {
            bots.forEach(bot => {
                const item = document.createElement('div');
                item.className = 'bot-list-item';
                item.textContent = bot.name;
                item.dataset.botId = bot.id;
                item.addEventListener('click', () => selectBot(bot.id));
                botList.appendChild(item);
            });
        }
    }

    function selectBot(botId) {
        activeBotId = botId;
        const bot = bots.find(b => b.id === botId);

        // Update active class in list
        document.querySelectorAll('.bot-list-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.botId) === botId);
        });

        // Populate editor
        editorTitle.textContent = `Edit: ${bot.name}`;
        botIdInput.value = bot.id;
        botNameInput.value = bot.name;
        codeEditor.setValue(bot.code || '');
        schemaEditor.setValue(bot.input_schema ? JSON.stringify(bot.input_schema, null, 2) : '');

        // Refresh editors to fix any display glitches
        setTimeout(() => {
            codeEditor.refresh();
            schemaEditor.refresh();
        }, 1);
    }

    function clearEditorAndSelect() {
        activeBotId = null;
        document.querySelectorAll('.bot-list-item').forEach(item => item.classList.remove('active'));

        editorTitle.textContent = "Create New Bot";
        botIdInput.value = '';
        botNameInput.value = '';
        codeEditor.setValue('');
        schemaEditor.setValue('');
    }

    async function handleSaveBot(e) {
        e.preventDefault();

        const botData = {
            name: botNameInput.value,
            code: codeEditor.getValue(),
            input_schema: null,
        };

        try {
            const schemaText = schemaEditor.getValue();
            if (schemaText.trim()) {
                botData.input_schema = JSON.parse(schemaText);
            }
        } catch (error) {
            alert("Invalid JSON in input schema.");
            return;
        }

        const method = activeBotId ? "PUT" : "POST";
        const url = activeBotId ? `/bots/${activeBotId}` : "/bots/";

        try {
            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(botData),
            });

            if (response.ok) {
                alert("Bot saved successfully!");
                fetchBots(); // Refresh the list
            } else {
                const error = await response.json();
                alert(`Error saving bot: ${error.detail}`);
            }
        } catch (error) {
            alert("An unexpected error occurred while saving the bot.");
        }
    }

    // --- RUNNING BOTS LOGIC (PLACEHOLDER) ---
    // This will be implemented in a future step.

    initialize();
});
