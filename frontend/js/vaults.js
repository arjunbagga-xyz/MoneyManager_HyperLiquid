document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    // --- STATE ---
    let activeWalletAddress = null;
    let vaults = [];

    // --- ELEMENT SELECTORS ---
    const vaultListContainer = document.getElementById('vault-list');
    const vaultCardTemplate = document.getElementById('vault-card-template');

    // --- INITIALIZATION ---
    window.onWalletReady = function(walletAddress) {
        activeWalletAddress = walletAddress;
        fetchVaultsAndEquity();
    }

    async function fetchVaultsAndEquity() {
        if (!activeWalletAddress) {
            vaultListContainer.innerHTML = '<p>Please select a wallet to see vault data.</p>';
            return;
        }

        try {
            // Fetch all vaults metadata
            const metaResponse = await fetch("/vaults/meta", { headers: { "Authorization": `Bearer ${token}` } });
            vaults = await metaResponse.json();

            // Fetch user's equity in all vaults for the active wallet
            const equityResponse = await fetch(`/wallets/${activeWalletAddress}/vault-equity`, { headers: { "Authorization": `Bearer ${token}` } });
            const equityData = await equityResponse.json();

            const equityMap = equityData.reduce((acc, item) => {
                acc[item.vault_address] = item.total_equity;
                return acc;
            }, {});

            renderVaults(equityMap);

        } catch (error) {
            console.error("Error fetching vault data:", error);
            vaultListContainer.innerHTML = '<p>Could not load vault data. Please try again.</p>';
        }
    }

    function renderVaults(equityMap) {
        vaultListContainer.innerHTML = '';
        const sortedVaults = [...vaults].sort((a, b) => parseFloat(b.total_apy) - parseFloat(a.total_apy));

        sortedVaults.forEach(vault => {
            const card = vaultCardTemplate.content.cloneNode(true);
            const vaultCard = card.querySelector('.vault-card');

            vaultCard.querySelector('.vault-name').textContent = vault.name;
            vaultCard.querySelector('.vault-apy').textContent = `${parseFloat(vault.total_apy).toFixed(2)}% APY`;
            vaultCard.querySelector('.vault-description').textContent = vault.description;
            vaultCard.querySelector('.user-equity').textContent = `$${parseFloat(equityMap[vault.address] || 0).toFixed(2)}`;
            vaultCard.querySelector('.vault-tvl').textContent = `$${(parseFloat(vault.raw_usd_borrow) / 1e6).toFixed(2)}M`; // Assuming value is in millions

            // --- Event Listeners for card actions ---
            const depositForm = vaultCard.querySelector('.deposit-form');
            const withdrawForm = vaultCard.querySelector('.withdraw-form');

            vaultCard.querySelector('.toggle-deposit').addEventListener('click', () => {
                depositForm.style.display = depositForm.style.display === 'flex' ? 'none' : 'flex';
                withdrawForm.style.display = 'none';
            });
            vaultCard.querySelector('.toggle-withdraw').addEventListener('click', () => {
                withdrawForm.style.display = withdrawForm.style.display === 'flex' ? 'none' : 'flex';
                depositForm.style.display = 'none';
            });

            vaultCard.querySelector('.deposit-btn').addEventListener('click', () => handleVaultAction('deposit', vault.address, vaultCard));
            vaultCard.querySelector('.withdraw-btn').addEventListener('click', () => handleVaultAction('withdraw', vault.address, vaultCard));

            vaultListContainer.appendChild(card);
        });
    }

    async function handleVaultAction(action, vaultAddress, cardElement) {
        const amountInput = cardElement.querySelector(`.${action}-amount`);
        const amount = parseFloat(amountInput.value);

        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        if (!activeWalletAddress) {
            alert("Please select an active wallet first.");
            return;
        }

        try {
            const response = await fetch(`/vaults/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    wallet_address: activeWalletAddress,
                    vault_address: vaultAddress,
                    amount: amount
                })
            });
            const result = await response.json();
            if (response.ok) {
                alert(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);
                amountInput.value = '';
                fetchVaultsAndEquity(); // Refresh all vault data
            } else {
                alert(`Error: ${result.detail}`);
            }
        } catch (error) {
            console.error(`Error during ${action}:`, error);
            alert(`An unexpected error occurred during ${action}.`);
        }
    }

    initialize();
});
