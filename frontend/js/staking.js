document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/account.html";
    }

    const validatorList = document.getElementById("validator-list");

    // Fetch validators
    fetch("http://localhost:8000/staking/validators", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        data.forEach(validator => {
            const validatorElement = document.createElement("div");
            validatorElement.className = "validator";
            validatorElement.innerHTML = `
                <h3>${validator.name}</h3>
                <p>Address: ${validator.address}</p>
                <p>Commission: ${validator.commission}</p>
                <p>Total Stake: ${validator.totalStake}</p>
                <button class="delegate-btn" data-validator-address="${validator.address}">Delegate</button>
                <button class="undelegate-btn" data-validator-address="${validator.address}">Undelegate</button>
            `;
            validatorList.appendChild(validatorElement);
        });
    });

    // Handle delegate
    validatorList.addEventListener("click", function (event) {
        if (event.target.className === "delegate-btn") {
            const validatorAddress = event.target.dataset.validatorAddress;
            const amount = prompt("Enter amount to delegate:");
            if (amount) {
                const walletId = prompt("Enter wallet ID to delegate from:");
                if (walletId) {
                    fetch("http://localhost:8000/staking/delegate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            validator_address: validatorAddress,
                            amount: parseFloat(amount),
                            wallet_id: parseInt(walletId)
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        alert("Delegation successful!");
                    })
                    .catch(error => {
                        console.error("Error delegating to validator:", error);
                        alert("Delegation failed.");
                    });
                }
            }
        }
    });

    // Handle undelegate
    validatorList.addEventListener("click", function (event) {
        if (event.target.className === "undelegate-btn") {
            const validatorAddress = event.target.dataset.validatorAddress;
            const amount = prompt("Enter amount to undelegate:");
            if (amount) {
                const walletId = prompt("Enter wallet ID to undelegate from:");
                if (walletId) {
                    fetch("http://localhost:8000/staking/undelegate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            validator_address: validatorAddress,
                            amount: parseFloat(amount),
                            wallet_id: parseInt(walletId)
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        alert("Undelegation successful!");
                    })
                    .catch(error => {
                        console.error("Error undelegating from validator:", error);
                        alert("Undelegation failed.");
                    });
                }
            }
        }
    });
});
