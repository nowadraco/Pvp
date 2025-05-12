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
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${move.name}</td>
            <td>${move.type}</td>
            <td>${move.power}</td>
            <td>${type === 'fast' ? move.energyGain : move.energy}</td>
            <td>${move.cooldown}</td>
            ${type === 'charged' ? `
                <td>${move.buffs ? move.buffs.join(', ') : '-'}</td>
                <td>${move.buffTarget || '-'}</td>
                <td>${move.buffApplyChance || '-'}</td>
            ` : ''}
        `;
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
