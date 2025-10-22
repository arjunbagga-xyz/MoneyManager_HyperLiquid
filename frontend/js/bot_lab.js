document.addEventListener("DOMContentLoaded", () => {
    const createBotForm = document.getElementById("create-bot-form");
    const botMessage = document.getElementById("bot-message");
    const botList = document.getElementById("bot-list");
    const token = localStorage.getItem("jwt");

    if (!token) {
        window.location.href = "account.html";
        return;
    }

    // Fetch and display existing bots on page load
    fetchBots(token);

    if (createBotForm) {
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
                    createBotForm.reset(); // Clear the form
                    fetchBots(token); // Refresh the list of bots
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
    }

    async function fetchBots(token) {
        try {
            const response = await fetch("http://localhost:8000/bots/", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) { throw new Error("Failed to fetch bots"); }
            const bots = await response.json();
            displayBots(bots);

        } catch (error) {
            botList.innerHTML = "<p>Could not load bots.</p>";
        }
    }

    function displayBots(bots) {
        botList.innerHTML = "";
        if (bots.length === 0) {
            botList.innerHTML = "<p>No bots created yet.</p>";
            return;
        }

        const ul = document.createElement("ul");
        bots.forEach(bot => {
            const li = document.createElement("li");
            li.textContent = bot.name;
            ul.appendChild(li);
        });
        botList.appendChild(ul);
    }
});
