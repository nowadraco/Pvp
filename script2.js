document.addEventListener('DOMContentLoaded', () => {
    const pokedexContainer = document.getElementById('pokedex-container');
    const searchInput = document.getElementById('search-input');
    // Se você não tiver este elemento no seu HTML, ele usará um objeto dummy para evitar erros.
    const errorMessageElement = document.getElementById('local-pokedex-error-message') || {
        textContent: '',
        classList: { add: () => {}, remove: () => {} }
    };
    let allPokemonData = [];
    let movesData = {}; // Para mapear IDs/nomes de movimento para nomes formatados

    // Função para buscar o sprite do Pokémon da PokeAPI
    async function fetchPokemonSpriteFromAPI(pokemonIdentifier) {
        let queryKey = pokemonIdentifier.toString().toLowerCase().trim();

        // Mapeamento para nomes/IDs que diferem na PokeAPI
        const nameMapping = {
            "nidoran f": "nidoran-f",
            "nidoran m": "nidoran-m",
            "mr. mime": "mr-mime",
            "farfetch'd": "farfetchd",
            "ho-oh": "ho-oh",
            "type: null": "type-null",
            "meowstic male": "meowstic-male",
            "meowstic female": "meowstic-female",
            "indeedee male": "indeedee-male",
            "indeedee female": "indeedee-female",
            // Adicionar outros mapeamentos conforme necessário com base nos seus speciesId
            "basculegion_f": "basculegion-female",
            "basculegion_m": "basculegion-male",
            "oricorio_baile": "oricorio-baile",
            "oricorio_pau": "oricorio-pau",
            "oricorio_pom_pom": "oricorio-pom-pom",
            "oricorio_sensu": "oricorio-sensu",
             "kommo_o": "kommo-o",
             "jangmo_o": "jangmo-o",
             "hakamo_o": "hakamo-o",
             "tapu koko": "tapu-koko",
             "tapu lele": "tapu-lele",
             "tapu bulu": "tapu-bulu",
             "tapu fini": "tapu-fini",
             "maushold_family_of_four": "maushold-family-of-four",
             "maushold_family_of_three": "maushold-family-of-three",
             "sirfetch'd": "sirfetchd", // Nome na API
             "mr_mime_galarian": "mr-mime-galarian",
             "mr_rime": "mr-rime",


        };

        let apiQueryName = queryKey;

        if (nameMapping[apiQueryName]) {
            apiQueryName = nameMapping[apiQueryName];
        }

        // Tenta remover sufixos comuns para encontrar a forma base
        const suffixesToRemove = [
            "_shadow", "_mega", "_mega_x", "_mega_y", "_alolan", "_galarian", "_hisuian", "_paldean",
            "_standard", "_zen", "_incarnate", "_therian", "_origin", "_hero", "_crowned_sword",
            "_crowned_shield", "_aria", "_pirouette", "_land", "_sky", "_attack", "_defense", "_speed",
            "_normal", "_burn", "_chill", "_douse", "_shock", "_plant", "_sandy", "_trash",
            "_average", "_large", "_small", "_super", "_midnight", "_midday", "_dusk",
            "_solo", "_school", "_10", "_50", "_complete", "_f", "_m", "_apex", "_ultimate", "_phony", "_antique",
            "_zero", "_female", "_male" // Adicionado para oinkologne
        ];

        let baseName = apiQueryName;
        for (const suffix of suffixesToRemove) {
            if (baseName.endsWith(suffix)) {
                baseName = baseName.substring(0, baseName.length - suffix.length);
                break;
            }
        }
        baseName = baseName.replace(/_/g, '-'); // Substitui underscores por hífens

        try {
            let response = await fetch(`https://pokeapi.co/api/v2/pokemon/${baseName}/`);

            if (!response.ok) { // Tenta com o nome original formatado se o baseName falhar
                response = await fetch(`https://pokeapi.co/api/v2/pokemon/${apiQueryName.replace(/_/g, '-')}/`);
            }
            if (!response.ok && !isNaN(parseInt(pokemonIdentifier))) { // Tenta com o ID numérico
                 response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonIdentifier}/`);
            }


            if (!response.ok) {
                console.warn(`Sprite not found for ${pokemonIdentifier} (tried base: ${baseName}, original formatted: ${apiQueryName.replace(/_/g, '-')}). Status: ${response.status}`);
                return 'placeholder.png';
            }
            const data = await response.json();
            return data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || 'placeholder.png';
        } catch (error) {
            console.error(`Error fetching sprite for ${pokemonIdentifier} (tried: ${baseName}, ${apiQueryName.replace(/_/g, '-')}). Original ID: ${pokemonIdentifier}:`, error);
            return 'placeholder.png';
        }
    }

    async function fetchData() {
        try {
            const [pokemonResponse, paldeaResponse, movesResponse] = await Promise.all([
                fetch('pokemon.json'),
                fetch('paldea.json'),
                fetch('moves.json')
            ]);

            if (!pokemonResponse.ok) throw new Error(`pokemon.json: ${pokemonResponse.status}`);
            if (!paldeaResponse.ok) throw new Error(`paldea.json: ${paldeaResponse.status}`);
            if (!movesResponse.ok) throw new Error(`moves.json: ${movesResponse.status}`);

            const pokemonJson = await pokemonResponse.json();
            const paldeaJson = await paldeaResponse.json();
            const localMovesJson = await movesResponse.json();

            allPokemonData = [...pokemonJson, ...paldeaJson];

            localMovesJson.forEach(move => {
                movesData[move.moveId.toUpperCase()] = move.name;
            });

            // Adiciona a busca de sprites
            const spritePromises = allPokemonData.map(async (pokemon, index) => {
                const identifier = pokemon.speciesId || pokemon.speciesName || pokemon.dex;
                const spriteUrl = await fetchPokemonSpriteFromAPI(identifier);
                // Adiciona um pequeno delay para não sobrecarregar a API
                if ((index + 1) % 20 === 0) { // Ajuste o número (20) conforme necessário
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                return { ...pokemon, sprite: spriteUrl };
            });

            allPokemonData = await Promise.all(spritePromises);

            displayPokedex(allPokemonData);

        } catch (error) {
            console.error('Failed to fetch or process Pokémon data:', error);
            errorMessageElement.textContent = `Could not load Pokédex data: ${error.message}. Check console.`;
            errorMessageElement.classList.remove('hidden');
        }
    }

    function getMoveNames(moveIds) {
        if (!moveIds || moveIds.length === 0) return 'None';
        return moveIds.map(id => movesData[id.toUpperCase().replace(/_FAST$/, '')] || id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ');
    }

    function displayPokedex(pokemonList) {
        pokedexContainer.innerHTML = '';

        if (pokemonList.length === 0) {
            pokedexContainer.innerHTML = '<p>No Pokémon found matching your search.</p>';
            return;
        }

        pokemonList.forEach(pokemon => {
            const card = document.createElement('div');
            card.classList.add('pokemon-card');

            const typesHtml = pokemon.types.filter(t => t && t.toLowerCase() !== 'none').map(type =>
                `<span class="type-badge type-${type.toLowerCase()}">${type}</span>`
            ).join(' ');

            const tagsHtml = pokemon.tags ? pokemon.tags.map(tag =>
                `<span class="tag tag-${tag.toLowerCase().replace(/\s+/g, '-')}">${tag}</span>`
            ).join(' ') : 'None';

            card.innerHTML = `
                <div class="pokemon-image-container">
                   <img src="${pokemon.sprite || 'placeholder.png'}" alt="${pokemon.speciesName}" onerror="this.onerror=null;this.src='placeholder.png';">
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
                    ${pokemon.family.parent ? ` (Evolves from: ${pokemon.family.parent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())})` : ''}
                    ${pokemon.family.evolutions && pokemon.family.evolutions.length > 0 ? ` (Evolves to: ${pokemon.family.evolutions.map(e => e.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')})` : ''}
                    </p>
                ` : ''}
                <p><strong>Tags:</strong> ${tagsHtml}</p>
            `;
            pokedexContainer.appendChild(card);
        });
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filteredPokemon = allPokemonData.filter(pokemon =>
            pokemon.speciesName.toLowerCase().includes(searchTerm) ||
            String(pokemon.dex).includes(searchTerm) ||
            pokemon.types.some(type => type && type.toLowerCase().includes(searchTerm)) ||
            (pokemon.tags && pokemon.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
        displayPokedex(filteredPokemon);
    });

    // Adiciona um estilo básico para as imagens no CSS ou aqui no JS se preferir
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        .pokemon-image-container img {
            width: 96px;
            height: 96px;
            display: block;
            margin: 10px auto;
            image-rendering: pixelated; /* Mantém a pixel art nítida */
            border: 1px solid #eee;
            background-color: #f9f9f9; /* Fundo claro para a imagem */
        }
        .type-badge { /* Estilo genérico para badges de tipo */
            display: inline-block;
            padding: 0.25em 0.5em;
            margin: 0.1em;
            border-radius: 0.25rem;
            color: white;
            font-size: 0.75em;
            text-transform: capitalize;
        }
        /* Adicione as cores dos tipos no seu style.css como no exemplo anterior */
    `;
    document.head.appendChild(styleSheet);

    fetchData();
});