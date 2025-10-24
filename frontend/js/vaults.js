document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "account.html";
        return;
    }

    const vaultList = document.getElementById("vault-list");
    const walletSelector = document.getElementById("wallet-selector");
    const modal = document.getElementById("vault-details-modal");
    const modalBody = document.getElementById("modal-body");
    const closeBtn = document.getElementsByClassName("close-btn")[0];
    let wallets = [];
    let vaults = [];

    async function initialize() {
        await fetchWallets();
        if (wallets.length > 0) {
            populateWalletSelector();
            await fetchVaults();
            await fetchAndDisplayVaultEquity();
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
            option.dataset.address = wallet.address;
            option.textContent = `${wallet.name} - ${wallet.address}`;
            walletSelector.appendChild(option);
        });
    }

    async function fetchVaults() {
        try {
            const response = await fetch("http://localhost:8000/vaults/meta", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch vaults");
            vaults = await response.json();
        } catch (error) {
            console.error("Error fetching vaults:", error);
        }
    }

    function displayVaults(equityData = {}) {
        vaultList.innerHTML = "";

        // Sort vaults by total_apy for the leaderboard
        const sortedVaults = [...vaults].sort((a, b) => parseFloat(b.total_apy) - parseFloat(a.total_apy));

        sortedVaults.forEach((vault, index) => {
            const vaultElement = document.createElement("div");
            vaultElement.className = "vault";
            vaultElement.dataset.address = vault.address; // Add this line
            const userEquity = equityData[vault.address] ? parseFloat(equityData[vault.address].total_equity).toFixed(2) : "0.00";

            vaultElement.innerHTML = `
                <h3>#${index + 1}: ${vault.name}</h3>
                <p><strong>Total APY:</strong> ${parseFloat(vault.total_apy).toFixed(2)}%</p>
                <p>Description: ${vault.description}</p>
                <p>Address: ${vault.address}</p>
                <p><strong>Your Equity: ${userEquity} USDC</strong></p>
                <button class="deposit-btn" data-vault-address="${vault.address}">Deposit</button>
                <button class="withdraw-btn" data-vault-address="${vault.address}">Withdraw</button>
            `;
            vaultList.appendChild(vaultElement);
        });
    }

    async function fetchAndDisplayVaultEquity() {
        const selectedOption = walletSelector.options[walletSelector.selectedIndex];
        if (!selectedOption) return;
        const walletAddress = selectedOption.dataset.address;

        try {
            const response = await fetch(`http://localhost:8000/wallets/${walletAddress}/vault-equity`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch vault equity");
            const equity = await response.json();

            const equityMap = equity.reduce((acc, item) => {
                acc[item.vault_address] = item;
                return acc;
            }, {});

            displayVaults(equityMap);
        } catch (error) {
            console.error("Error fetching vault equity:", error);
            displayVaults(); // Display vaults without equity info on error
        }
    }

    walletSelector.addEventListener("change", fetchAndDisplayVaultEquity);

    vaultList.addEventListener("click", async function (event) {
        const target = event.target;
        const vaultAddress = target.closest(".vault")?.dataset.address;

        if (!vaultAddress) return;

        // Handle deposit and withdraw buttons
        if (target.className === "deposit-btn" || target.className === "withdraw-btn") {
            const isDeposit = target.className === "deposit-btn";
            const action = isDeposit ? "deposit" : "withdraw";
            const amount = prompt(`Enter amount to ${action}:`);
            const walletId = walletSelector.value;

            if (amount && walletId) {
                try {
                    const response = await fetch(`http://localhost:8000/vaults/${action}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            vault_address: vaultAddress,
                            amount: parseFloat(amount),
                            wallet_id: parseInt(walletId)
                        })
                    });
                    if (response.ok) {
                        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);
                        fetchAndDisplayVaultEquity(); // Refresh equity
                    } else {
                        const error = await response.json();
                        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} failed: ${error.detail || 'Unknown error'}`);
                    }
                } catch (error) {
                    console.error(`Error ${action}ing vault:`, error);
                    alert(`${action.charAt(0).toUpperCase() + action.slice(1)} failed.`);
                }
            }
        }
        // Handle clicks on the vault element itself for details
        else if (target.closest(".vault")) {
            openVaultDetailsModal(vaultAddress);
        }
    });

    async function openVaultDetailsModal(vaultAddress) {
        try {
            const response = await fetch(`http://localhost:8000/vaults/${vaultAddress}/details`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch vault details");
            const details = await response.json();

            modalBody.innerHTML = `
                <h2>${details.name}</h2>
                <p><strong>Description:</strong> ${details.description}</p>
                <p><strong>Total APY:</strong> ${parseFloat(details.total_apy).toFixed(2)}%</p>
                <p><strong>Raw USD Borrow:</strong> ${parseFloat(details.raw_usd_borrow).toFixed(2)}</p>
                <div id="pnl-chart" style="height: 300px;"></div>
            `;
            modal.style.display = "block";

            renderPnlChart(details.daily_pnl_per_share);

        } catch (error) {
            console.error("Error fetching vault details:", error);
            modalBody.innerHTML = "<p>Could not load vault details. Please try again.</p>";
            modal.style.display = "block";
        }
    }

    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    function renderPnlChart(pnlData) {
        const chartContainer = document.getElementById('pnl-chart');
        chartContainer.innerHTML = ''; // Clear previous chart
        const chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: {
                backgroundColor: '#ffffff',
                textColor: 'rgba(0, 0, 0, 0.9)',
            },
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
                horzLines: { color: 'rgba(197, 203, 206, 0.5)' },
            },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.8)' },
            timeScale: { borderColor: 'rgba(197, 203, 206, 0.8)' },
        });

        const lineSeries = chart.addLineSeries({ color: 'rgba(4, 111, 232, 1)' });

        const formattedData = pnlData.map(item => ({
            time: item.time, // The API provides timestamps in seconds
            value: parseFloat(item.pnl),
        })).sort((a, b) => a.time - b.time); // Ensure data is sorted by time

        lineSeries.setData(formattedData);
        chart.timeScale().fitContent();
    }

    initialize();
});
