import fetch from 'node-fetch';
import {load} from 'cheerio';
import fs from 'fs';
import path from 'path';

const POKEMON_COUNT = 898;
const TYPE_COUNT = 18;
const API_URL = 'http://localhost:5001/pokemon-api-d5ce5/us-central1/api';

/**
 * Downloads pokemon pages from pokemondb.net
 */
async function downloadFromPokemonDB() {
  const base = 'https://pokemondb.net';

  const response = await fetch(`${base}/pokedex/national`);
  const html = await response.text();

  const $ = load(html);
  const infocards = $('div.infocard-list div.infocard').toArray();

  const pokemonPages = [];

  for (const infocard of infocards.values()) {
    const el = $(infocard);
    const uri = el.find('div.infocard span.infocard-lg-img a').attr('href');
    const pokemonPage = await fetch(`${base}${uri}`);

    pokemonPages.push(pokemonPage);
  }

  if (!fs.existsSync('./docs/pokemondb/pokemon')) {
    fs.mkdirSync('./docs/pokemondb/pokemon');
  }

  for (const [index, page] of pokemonPages.entries()) {
    const content = await page.text();
    fs.writeFile(`./docs/pokemondb/pokemon_${index+1}.html`, content, console.log);
  }
};

/**
 * Downloads type pages from pokemondb.net
 */
async function downloadTypesFromPokemonDB() {
  const base = 'https://pokemondb.net';

  const response = await fetch(`${base}/type`);
  const html = await response.text();

  const $ = load(html);
  const main = $('#main');
  const typeQuickList = main.find('p > a.type-icon');

  const typePages = [];

  for (const typeLink of typeQuickList) {
    const el = $(typeLink);
    const uri = el.attr('href');
    const typePage = await fetch(`${base}${uri}`);

    typePages.push(typePage);
  }

  if (!fs.existsSync('./docs/pokemondb/types')) {
    fs.mkdirSync('./docs/pokemondb/types');
  }

  for (const [index, page] of typePages.entries()) {
    const content = await page.text();
    const $ = load(content);

    const typeName = $('h1').text().split(" ")[0].toLowerCase();
    
    fs.writeFile(`./docs/pokemondb/types/${typeName}.html`, content, console.log);
  }
};

/**
 * Downloads pokemon data from pokeapi.co
 */
async function downloadFromPokemonAPI() {
  const base = 'https://pokeapi.co/api/v2/pokemon';

  for (let index = 1; index <= POKEMON_COUNT; index++) {
    const response = await fetch(`${base}/${index}`);
    const typeData = await response.json();

    if (!fs.existsSync('./docs/pokeAPI/pokemon')) {
      fs.mkdirSync('./docs/pokeAPI/pokemon');
    }

    fs.writeFile(`./docs/pokeAPI/pokemon/pokemon_${index}.json`, JSON.stringify(typeData), console.log);
  }
};

/**
 * Downloads type data from pokeapi.co
 */
async function downloadTypesFromPokemonAPI() {
  const base = 'https://pokeapi.co/api/v2/type';

  for (let index = 1; index <= TYPE_COUNT; index++) {
    const response = await fetch(`${base}/${index}`);
    const typeData = await response.json();

    if (!fs.existsSync('./docs/pokeAPI/types')) {
      fs.mkdirSync('./docs/pokeAPI/types');
    }

    fs.writeFile(`./docs/pokeAPI/types/${typeData.name}.json`, JSON.stringify(typeData), console.log);
  }
};

/**
 * Combines data from pokemondb and pokeapi into custom format.
 */
function combineData() {
  for (let index = 1; index <= POKEMON_COUNT; index++) {
    const pokemonDBData = fs.readFileSync(`./docs/pokemondb/pokemon/pokemon_${index}.html`, console.log);
    const $ = load(pokemonDBData);
    const main = $('#main');

    const pokeApiData = JSON.parse(fs.readFileSync(`./docs/pokeAPI/pokemon/pokemon_${index}.json`));

    // pokedex entry
    const entriesHeader = main.find('h2').filter((_i, e) => $(e).text() == 'Pokédex entries');
    const pokedexEntry = extracPokedexEntry(entriesHeader);

    // localization
    const localizationHeader = main.find('h2').filter((_i, e) => $(e).text() == 'Other languages');
    const localization = extractLocalization($, localizationHeader);

    // formatting abilities
    const abilities = pokeApiData.abilities.map((abilityObject) => {
      return {
        slot: abilityObject.slot,
        is_hidden: abilityObject.is_hidden,
        name: abilityObject.ability.name
      };
    });

    // formatting types
    const types = pokeApiData.types.reduce((accumulator, type) => ({ ...accumulator, [type.type.name]: true}), {});

    // type defences
    const baseInformation = main.find('div.tabset-basics.sv-tabs-wrapper > div.sv-tabs-panel-list > div:first-child');

    const defensesSection = baseInformation.find('h2').filter((_i, e) => $(e).text() == 'Type defenses').parent();
    const typeDefenses = extractTypeDefenses($, defensesSection);

    // formatting stats
    const baseStatTable = baseInformation.find('h2').filter((_i, e) => $(e).text() == 'Base stats').parent();
    const stats = extractStats($, baseStatTable, pokeApiData.stats);

    const data = {
      'id': pokeApiData.id,
      'name': pokeApiData.name,
      'localization': localization,
      'pokedex_entry': pokedexEntry,
      'base_experience': pokeApiData.base_experience,
      'height': pokeApiData.height,
      'weight': pokeApiData.weight,
      'stats': stats,
      'types': types,
      'type_defenses': typeDefenses,
      'abilities': abilities,
    };

    fs.writeFileSync(`./docs/personal/pokemon/${index}.json`, JSON.stringify(data), console.log);
  }
};

/**
 * Combines type data from pokemondb and pokeapi into custom format.
 */
function combineTypeData() {
  const pokemonDBFiles = fs.readdirSync(`./docs/pokemondb/types`, console.log);
  for (let index = 0; index < pokemonDBFiles.length; index++) {
    const fileName = path.parse(pokemonDBFiles[index]);

    const pokemonDBFile = fs.readFileSync(`./docs/pokemondb/types/${fileName.base}`);
    const pokeAPIFile = JSON.parse(fs.readFileSync(`./docs/pokeAPI/types/${fileName.name}.json`));
    
    const $ = load(pokemonDBFile);
    const main = $('#main');
    const typePokemon = main.find('div.infocard-list.infocard-list-pkmn-md > div.infocard');

    const pokemon = [];
    let lastID = 0;
    typePokemon.each((_index, pkmn) => {
      const name = $(pkmn).find('span.infocard-md-data > a:first-child').text().toLowerCase();
      const data = $(pkmn).find('span.infocard-md-data > small.text-muted:last-child').text().split(/[\W]+/);
      data.shift();

      const id = Number(data[0]);
      if (id !== lastID) {
        pokemon.push(name);
        lastID = id;
      }
    });

    const typeMatchups = {};
    Object.entries(pokeAPIFile.damage_relations).forEach(([key, matchups]) => {
      const data = matchups.map(type => type.name);
      typeMatchups[key] = data;
    });

    const typeData = {
      id: (index + 1),
      name: pokeAPIFile.name,
      matchups: typeMatchups,
      damage_class: pokeAPIFile.move_damage_class?.name,
      pokemon_count: pokemon.length,
      pokemon: pokemon,
    }

    fs.writeFileSync(`./docs/personal/types/${fileName.name}.json`, JSON.stringify(typeData), console.log);
  }
}

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
 * Extracts the name localization from the pokemondb data.
 * @param {function} cheerio
 * @param {Element} cheerioElement
 * @return {array} localization information
 */
function extractLocalization(cheerio, cheerioElement) {
  const localization = [];
  const localizationRows = cheerioElement.next().find('table:first-child tbody tr');
  localizationRows.each((_index, row) => {
    const languages = cheerio(row).find('th').text().toLowerCase().split(', ');
    const name = cheerio(row).find('td').text().toLowerCase();

    languages.forEach((language) => localization.push({'language': language, 'name': name}));
  });

  return localization;
}

/**
 * Extracts the type defenses from the pokemondb data.
 * @param {function} cheerio
 * @param {Element} cheerioElement
 * @return {array} type defenses
 */
function extractTypeDefenses(cheerio, cheerioElement) {
  const typeDefenses = {"double_damage_from": [], "half_damage_from": [], "no_damage_from": []};

  const defenses = cheerioElement.find('table.type-table tbody tr:nth-child(2) td');
  defenses.each((_index, defense) => {
    const defenseInfo = cheerio(defense);

    let [attacker, _defender, effectiveness] = defenseInfo.attr('title').split(/[→=]/).map((str) => str.trim().toLowerCase());
    switch (effectiveness) {
      case 'super-effective':
        typeDefenses.double_damage_from.push(attacker)
        break;
      case 'not very effective':
        typeDefenses.half_damage_from.push(attacker)
        break;
      case 'no effect':
        typeDefenses.no_damage_from.push(attacker)
        break;
    }
  });

  return typeDefenses;
}

/**
 * Extracts the stats from the pokemondb data and combines them with the stats from pokeAPI.
 * @param {function} cheerio
 * @param {Element} cheerioElement
 * @param {Object} pokeApiStats
 * @return {array} stat information
 */
function extractStats(cheerio, cheerioElement, pokeApiStats) {
  const baseStatTable = cheerioElement.find('table.vitals-table tbody');
  const stats = pokeApiStats.map((statObject) => {
    const newObj = {};

    newObj['base_stat'] = statObject.base_stat;
    newObj['effort'] = statObject.effort;
    newObj['name'] = statObject.stat.name;

    let formattedName = '';

    if (statObject.stat.name == 'special-attack') {
      const parts = statObject.stat.name.split('-');
      const prefix = capitalize(parts[0]).substring(0, 2);
      const postfix = capitalize(parts[1]).replace('tac', '');

      formattedName = `${prefix}. ${postfix}`;
    } else if (statObject.stat.name == 'special-defense') {
      const parts = statObject.stat.name.split('-');
      const prefix = capitalize(parts[0]).substring(0, 2);
      const postfix = capitalize(parts[1]).substring(0, 3);

      formattedName = `${prefix}. ${postfix}`;
    } else if (statObject.stat.name == 'hp') {
      formattedName = statObject.stat.name.toUpperCase();
    } else {
      formattedName = capitalize(statObject.stat.name);
    }

    const statInfo = baseStatTable.find('th').filter((_i, e) => cheerio(e).text() == formattedName).parent();
    const statMax = statInfo.find('td:nth-child(5)');
    const statMin = statInfo.find('td:nth-child(4)');

    newObj['min'] = parseInt(statMin.text());
    newObj['max'] = parseInt(statMax.text());

    return newObj;
  });

  return stats;
}

/**
 * Capitalizeses the given string.
 *
 * @param {string} string
 * @return {string} capitalized string
 */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

combineData();
combineTypeData();