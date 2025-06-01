document.addEventListener('DOMContentLoaded', () => {
    const pokedexContainer = document.getElementById('pokedex-container');
    const searchInput = document.getElementById('search-input');
    const errorMessageElement = document.getElementById('local-pokedex-error-message') || {
        textContent: '',
        classList: { add: () => {}, remove: () => {} }
    };

    // Controles de Paginação
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageInfoElement = document.getElementById('page-info');

    let allPokemonData = []; // Todos os Pokémon carregados
    let filteredPokemonData = []; // Pokémon após a filtragem pela busca
    let movesData = {};
    const PLACEHOLDER_IMAGE_URL = 'https://raw.githubusercontent.com/nowadraco/Pvp/refs/heads/main/placeholder.png';

    let currentPage = 1;
    const ITEMS_PER_PAGE = 100; // Mostrar 100 Pokémon por vez

    async function fetchData() {
        try {
            const [pokemonResponse, paldeaResponse, movesResponse] = await Promise.all([
                fetch('pokemon.json'),
                fetch('paldea.json'),
                fetch('moves.json')
            ]);

            if (!pokemonResponse.ok) throw new Error(`pokemon.json: ${pokemonResponse.statusText || pokemonResponse.status}`);
            if (!paldeaResponse.ok) throw new Error(`paldea.json: ${paldeaResponse.statusText || paldeaResponse.status}`);
            if (!movesResponse.ok) throw new Error(`moves.json: ${movesResponse.statusText || movesResponse.status}`);

            const pokemonJson = await pokemonResponse.json();
            const paldeaJson = await paldeaResponse.json();
            const localMovesJson = await movesResponse.json();

            allPokemonData = [...pokemonJson, ...paldeaJson];
            filteredPokemonData = [...allPokemonData]; // Inicialmente, todos os Pokémon são "filtrados"

            localMovesJson.forEach(move => {
                movesData[move.moveId.toUpperCase()] = move.name;
            });

            allPokemonData.forEach(pokemon => {
                pokemon.sprite = PLACEHOLDER_IMAGE_URL;
            });

            // Não é mais necessário buscar sprites aqui se você estiver usando o placeholder local
            // Se fosse buscar da API externa, seria aqui, possivelmente de forma paginada também.

            renderCurrentPage(); // Renderiza a primeira página
            setupPagination();    // Configura os controles de paginação

        } catch (error) {
            console.error('Failed to fetch Pokémon data from local JSONs:', error);
            errorMessageElement.textContent = `Could not load Pokédex data: ${error.message}. Check console.`;
            if (errorMessageElement.classList) {
                errorMessageElement.classList.remove('hidden');
            }
        }
    }

    function getMoveNames(moveIds) {
        if (!moveIds || moveIds.length === 0) return 'None';
        return moveIds.map(id => {
            const moveIdClean = id.toUpperCase().replace(/_FAST$/, '');
            return movesData[moveIdClean] || id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }).join(', ');
    }

    function displayPokedexPage(pokemonListPage) {
        pokedexContainer.innerHTML = '';

        if (pokemonListPage.length === 0) {
            pokedexContainer.innerHTML = searchInput.value.trim() === '' ? '<p>No Pokémon data loaded.</p>' :'<p>No Pokémon found matching your search.</p>';
            return;
        }

        pokemonListPage.forEach(pokemon => {
            const card = document.createElement('div');
            card.classList.add('pokemon-card');

            const typesHtml = pokemon.types
                .filter(t => t && t.toLowerCase() !== 'none')
                .map(type => `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`)
                .join(' ');

            const tagsHtml = pokemon.tags ? pokemon.tags.map(tag =>
                `<span class="tag tag-${tag.toLowerCase().replace(/\s+/g, '-')}">${tag}</span>`
            ).join(' ') : 'None';

            let familyEvolutionsString = '';
            if (pokemon.family && pokemon.family.evolutions) {
                if (Array.isArray(pokemon.family.evolutions) && pokemon.family.evolutions.length > 0) {
                    familyEvolutionsString = pokemon.family.evolutions.map(e => e.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
                } else if (typeof pokemon.family.evolutions === 'string') {
                    familyEvolutionsString = pokemon.family.evolutions.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
            }
            const familyParent = pokemon.family?.parent?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase());

            card.innerHTML = `
                <div class="pokemon-image-container">
                   <img src="${pokemon.sprite}" alt="${pokemon.speciesName}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE_URL}';">
                </div>
                <h2>#${pokemon.dex} ${pokemon.speciesName}</h2>
                <p><strong>Types:</strong> ${typesHtml || 'N/A'}</p>
                <p><strong>Stats:</strong> Atk: ${pokemon.baseStats.atk}, Def: ${pokemon.baseStats.def}, HP: ${pokemon.baseStats.hp}</p>
                <div class="pokemon-moves">
                    <p><strong>Fast Moves:</strong> ${getMoveNames(pokemon.fastMoves)}</p>
                    <p><strong>Charged Moves:</strong> ${getMoveNames(pokemon.chargedMoves)}</p>
                    ${pokemon.eliteMoves && pokemon.eliteMoves.length > 0 ? `<p><strong>Elite Moves:</strong> ${getMoveNames(pokemon.eliteMoves)}</p>` : ''}
                </div>
                <p><strong>Released:</strong> ${pokemon.released ? 'Yes' : 'No'}</p>
                ${pokemon.family && pokemon.family.id ? `
                    <p><strong>Family:</strong> ${pokemon.family.id}
                    ${familyParent ? ` (Evolves from: ${familyParent})` : ''}
                    ${familyEvolutionsString ? ` (Evolves to: ${familyEvolutionsString})` : ''}
                    </p>
                ` : ''}
                <p><strong>Tags:</strong> ${tagsHtml}</p>
            `;
            pokedexContainer.appendChild(card);
        });
    }

    function renderCurrentPage() {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pokemonToShow = filteredPokemonData.slice(startIndex, endIndex);
        displayPokedexPage(pokemonToShow);
        updatePageInfo();
        updatePaginationButtons();
    }

    function updatePageInfo() {
        const totalPages = Math.ceil(filteredPokemonData.length / ITEMS_PER_PAGE);
        pageInfoElement.textContent = `Página ${currentPage} de ${totalPages > 0 ? totalPages : 1}`;
    }

    function updatePaginationButtons() {
        const totalPages = Math.ceil(filteredPokemonData.length / ITEMS_PER_PAGE);
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === totalPages || totalPages === 0;
    }

    function setupPagination() {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCurrentPage();
            }
        });

        nextButton.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPokemonData.length / ITEMS_PER_PAGE);
            if (currentPage < totalPages) {
                currentPage++;
                renderCurrentPage();
            }
        });
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm === '') {
            filteredPokemonData = [...allPokemonData];
        } else {
            filteredPokemonData = allPokemonData.filter(pokemon =>
                pokemon.speciesName.toLowerCase().includes(searchTerm) ||
                String(pokemon.dex).includes(searchTerm) ||
                pokemon.types.some(type => type && type.toLowerCase().includes(searchTerm)) ||
                (pokemon.tags && pokemon.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        }
        currentPage = 1; // Reseta para a primeira página ao buscar
        renderCurrentPage();
        updatePaginationButtons(); // Atualiza os botões após a busca
    });

    // Injeção de CSS (mantida do script anterior)
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .pokemon-image-container img {
            width: 96px; height: 96px; display: block; margin: 10px auto;
            image-rendering: pixelated; border: 1px solid #eee; background-color: #f9f9f9;
        }
        .type-badge {
            display: inline-block; padding: 0.25em 0.5em; margin: 0.1em;
            border-radius: 0.25rem; color: white; font-size: 0.75em; text-transform: capitalize;
        }
        .type-grass { background-color: #78C850; } .type-poison { background-color: #A040A0; }
        .type-fire { background-color: #F08030; } .type-flying { background-color: #A890F0; }
        .type-water { background-color: #6890F0; } .type-bug { background-color: #A8B820; }
        .type-normal { background-color: #A8A878; } .type-electric { background-color: #F8D030; }
        .type-ground { background-color: #E0C068; } .type-fairy { background-color: #EE99AC; }
        .type-fighting { background-color: #C03028; } .type-psychic { background-color: #F85888; }
        .type-rock { background-color: #B8A038; } .type-steel { background-color: #B8B8D0; }
        .type-ice { background-color: #98D8D8; } .type-ghost { background-color: #705898; }
        .type-dragon { background-color: #7038F8; } .type-dark { background-color: #705848; }
        .tag {
            display: inline-block; padding: 3px 8px; margin-right: 5px; margin-bottom: 5px;
            border-radius: 4px; font-size: 0.8em; color: #fff; background-color: #6c757d;
        }
        .tag-starter { background-color: #5cb85c; } .tag-legendary { background-color: #f0ad4e; }
        .tag-mythical { background-color: #d9534f; } .tag-shadow { background-color: #5bc0de; }
        .tag-shadoweligible { background-color: #0275d8; } .tag-mega { background-color: #9932CC; }
        .tag-regional { background-color: #FF69B4; } .tag-alolan { background-color: #87CEEB; }
        .tag-galarian { background-color: #ADD8E6; } .tag-hisuian { background-color: #D8BFD8; }
        .tag-paldean { background-color: #FFDAB9; }
    `;
    document.head.appendChild(styleSheet);

    fetchData();
});