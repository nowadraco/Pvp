// Arquivo JavaScript (script.js)
const fastMovesTable = document.getElementById("fast-moves-table");
const chargedMovesTable = document.getElementById("charged-moves-table");
const errorMessageElement = document.getElementById("error-message");

function populateTable(table, data, type) {
    const tableBody = table.querySelector("tbody");
    tableBody.innerHTML = "";

    if (!data || data.length === 0) {
        errorMessageElement.textContent = `Não foi possível carregar os dados de ${type}.`;
        return;
    } else {
        errorMessageElement.textContent = ""; // Limpa qualquer mensagem de erro anterior
    }

    data.forEach(move => {
        // Converte cooldown de milissegundos para turnos (1 turno = 500ms)
        const cooldownTurns = (move.cooldown / 500).toFixed(1); // Arredonda para 1 casa decimal
        let buffChanceDisplay = move.buffApplyChance;
        if (type === 'charged') {
            buffChanceDisplay = move.buffApplyChance ? `${(parseFloat(move.buffApplyChance) * 100).toFixed(1)}%` : '-'; // Arredonda para 1 casa decimal
        }

        const row = document.createElement("tr");
        if (type === 'fast') {
            row.innerHTML = `
                <td>${move.name}</td>
                <td>${move.type}</td>
                <td>${move.power}</td>
                <td>${move.energyGain}</td>
                <td>${cooldownTurns}</td>
            `;
        } else { // Para movimentos carregados, remove as colunas Buffs e Alvo do Buff
            row.innerHTML = `
                <td>${move.name}</td>
                <td>${move.type}</td>
                <td>${move.power}</td>
                <td>${move.energy}</td>
                <td>${buffChanceDisplay}</td>
            `;
        }
        tableBody.appendChild(row);
    });
}

function loadMoveData() {
    const movesUrl = "https://raw.githubusercontent.com/nowadraco/Pvp/refs/heads/main/moves.json";

    fetch(movesUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao buscar dados: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Filtra os movimentos com base nas condições de energia
            const fastMovesData = data.filter(move => move.energy === 0);
            const chargedMovesData = data.filter(move => move.energyGain === 0);

            if (fastMovesData.length > 0) {
                populateTable(fastMovesTable, fastMovesData, "fast");
            } else {
                errorMessageElement.textContent = "Não foi possível carregar os dados de fast.";
            }

            if (chargedMovesData.length > 0) {
                populateTable(chargedMovesTable, chargedMovesData, "charged");
            } else {
                errorMessageElement.textContent = "Não foi possível carregar os dados de charged.";
            }
        })
        .catch(error => {
            errorMessageElement.textContent = "Ocorreu um erro ao carregar os dados.";
            console.error(error);
        });
}

window.onload = () => {
    loadMoveData();
};
