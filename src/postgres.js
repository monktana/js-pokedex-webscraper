import fs from 'fs';
import path from 'path';
import {load} from 'cheerio';

const POKEMON_COUNT = 898;
const POKEMONDB_DIR = './docs/pokemondb';
const POKEMONAPI_DIR = './docs/pokeAPI';
const PERSONAL_DIR = './docs/personal';

const TYPES = {
  bug: 1,
  dark: 2,
  dragon: 3,
  electric: 4,
  fairy: 5,
  fighting: 6,
  fire: 7,
  flying: 8,
  ghost: 9,
  grass: 10,
  ground: 11,
  ice: 12,
  normal: 13,
  poison: 14,
  psychic: 15,
  rock: 16,
  steel: 17,
  water: 18
}

/**
 * Combines data from pokemondb and pokeapi into custom format.
 */
function pokemonCSV() {
  const pokemonData = [];
  for (let index = 1; index <= POKEMON_COUNT; index++) {
    const pokemonDBData = fs.readFileSync(`${POKEMONDB_DIR}/pokemon/pokemon_${index}.html`, console.log);
    const $ = load(pokemonDBData);
    const main = $('#main');

    const pokeApiData = JSON.parse(fs.readFileSync(`${POKEMONAPI_DIR}/pokemon/pokemon_${index}.json`));

    // pokedex entry
    const entriesHeader = main.find('h2').filter((_i, e) => $(e).text() == 'Pokédex entries');
    const pokedexEntry = extracPokedexEntry(entriesHeader);

    const data = {
      'id': pokeApiData.id,
      'name': pokeApiData.name,
      'base_experience': pokeApiData.base_experience,
      'height': pokeApiData.height,
      'weight': pokeApiData.weight,
      'pokedex_entry': pokedexEntry
    };

    pokemonData.push(data);
  }

  const fields = Object.keys(pokemonData[0]);
  const replacer = (key, value) => value ? value : ''; //handles empty values

  var csv = pokemonData.map(function(row){
    return fields.map(function(fieldName){
      return JSON.stringify(row[fieldName], replacer)
    }).join(',')
  })
  csv.unshift(fields.join(',')) // add header column
  csv = csv.join('\r\n');

  fs.writeFileSync(`${PERSONAL_DIR}/db/pokemon.csv`, csv, console.log);
};

/**
 * Extracts the (latest) pokedex entry from the pokemondb data.
 * @param {Element} cheerioElement
 * @return {string} the pokedex entry
 */
function extracPokedexEntry(cheerioElement) {
  let neighbour = cheerioElement.next();
  if (neighbour[0].name == 'h3') {
    neighbour = neighbour.next();
  }
  return neighbour.find('table.vitals-table tbody tr:last-child td').text();
}

/**
 * Combines data from pokemondb and pokeapi into custom format.
 */
function pokemonHasTypeCSV() {
  const typeData = [];

  const typeFiles = fs.readdirSync(`./docs/pokeAPI/pokemon`, console.log);
  for (let index = 0; index < typeFiles.length; index++) {
    const fileName = path.parse(typeFiles[index]);
    const pokemonData = JSON.parse(fs.readFileSync(`./docs/pokeAPI/pokemon/${fileName.name}.json`));
    
    const types = pokemonData.types.map((value => TYPES[value.type.name]));

    typeData[pokemonData.id] = types;
  }

  const fields = ["pokemonID", "typeID"];

  var csv = typeData.map((typeIDs, pokemonID) => {
    return typeIDs.map((typeID) => {
      return `${pokemonID},${typeID}`
    }).join('\r\n')
  })
  csv[0] = fields.join(',') // add header column
  const csvJoined = csv.join('\r\n');

  fs.writeFileSync(`${PERSONAL_DIR}/db/pokemon_has_types.csv`, csvJoined, console.log);
};

/**
 * Combines data from pokemondb and pokeapi into custom format.
 */
function typesCSV() {
  const typeData = [];

  const typeFiles = fs.readdirSync(`./docs/pokeAPI/types`, console.log);
  for (let index = 0; index < typeFiles.length; index++) {
    const fileName = path.parse(typeFiles[index]);
    const typeFile = JSON.parse(fs.readFileSync(`./docs/pokeAPI/types/${fileName.name}.json`));

    const data = {
      id: (index + 1),
      name: typeFile.name,
      damage_class: typeFile.move_damage_class?.name
    }

    typeData.push(data);
  }

  const fields = Object.keys(typeData[0]);
  const replacer = (key, value) => value ? value : ''; //handles empty values

  var csv = typeData.map(function(row){
    return fields.map(function(fieldName){
      return JSON.stringify(row[fieldName], replacer)
    }).join(',')
  })
  csv.unshift(fields.join(',')) // add header column
  csv = csv.join('\r\n');

  fs.writeFileSync(`${PERSONAL_DIR}/db/types.csv`, csv, console.log);
};

/**
 * Combines data from pokemondb and pokeapi into custom format.
 */
function typeMatchupsCSV() {
  const typeData = [];

  const typeFile = JSON.parse(fs.readFileSync(`./docs/typematchups.json`));
  Object.entries(typeFile).forEach(types => {
    const attacking = TYPES[types[0]];
    const matchups = types[1];

    Object.entries(matchups).forEach(matchup => {
      const defending = TYPES[matchup[0]];
      const effectiveness = matchup[1];

      const data = {
        attackingTypeID: attacking,
        defendingTypeID: defending,
        effectiveness: effectiveness
      }

      typeData.push(data);
    });
  });

  const fields = ["attackingTypeID", "defendingTypeID", "effectiveness"];
  const replacer = (key, value) => value ? value : ''; //handles empty values

  var csv = typeData.map(function(row){
    return fields.map(function(fieldName){
      return JSON.stringify(row[fieldName], replacer)
    }).join(',')
  })
  csv.unshift(fields.join(',')) // add header column
  csv = csv.join('\r\n');

  fs.writeFileSync(`${PERSONAL_DIR}/db/typematchups.csv`, csv, console.log);
};

pokemonCSV();
pokemonHasTypeCSV();
typesCSV();
typeMatchupsCSV();