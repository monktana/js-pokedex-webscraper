import fetch from 'node-fetch';
import {load} from 'cheerio';
import fs from 'fs';

const POKEMON_COUNT = 898;

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

  for (const [index, page] of pokemonPages.entries()) {
    const content = await page.text();
    fs.writeFile(`./docs/pokemondb/pokemon_${index+1}.html`, content, console.log);
  }
};

/**
 * Downloads pokemon data from pokeapi.co
 */
async function downloadFromPokemonAPI() {
  const base = 'https://pokeapi.co/api/v2/pokemon';

  for (let index = 1; index <= POKEMON_COUNT; index++) {
    const response = await fetch(`${base}/${index}`);
    const json = await response.json();

    if (!fs.existsSync('./docs/pokeAPI')) {
      fs.mkdirSync('./docs/pokeAPI');
    }

    fs.writeFile(`./docs/pokeAPI/pokemon_${index}.json`, JSON.stringify(json), console.log);
  }
};

/**
 * Combines data from pokemondb and pokeapi into custom format.
 */
function combineData() {
  for (let index = 1; index <= POKEMON_COUNT; index++) {
    const pokemonDBData = fs.readFileSync(`./docs/pokemondb/pokemon_${index}.html`, console.log);
    const $ = load(pokemonDBData);

    let pokeApiData = fs.readFileSync(`./docs/pokeAPI/pokemon_${index}.json`, console.log);
    pokeApiData = JSON.parse(pokeApiData);

    const {id, name, stats, types, weight, abilities, base_experience, height} = pokeApiData;

    // pokedex entry
    const pokedexEntries = $('h2').filter((_i, e) => $(e).text() == 'Pokédex entries').next();
    const latestEntry = pokedexEntries.find('table.vitals-table tbody tr:last-child td').text();

    // localization
    const localization = [];
    const localizationSection = $('h2').filter((_i, e) => $(e).text() == 'Other languages').parent();
    const nameTable = localizationSection.find('table.vitals-table tbody tr');
    nameTable.each((_index, row) => {
      const languages = $(row).find('th').text().toLowerCase().split(', ');
      const name = $(row).find('td').text().toLowerCase();

      languages.forEach((language) => localization.push({'language': language, 'name': name}));
    });

    // formatting types
    const formattedAbilities = abilities.map((abilityObject) => {
      const newObj = {};

      newObj['slot'] = abilityObject.slot;
      newObj['is_hidden'] = abilityObject.is_hidden;
      newObj['name'] = abilityObject.ability.name;

      return newObj;
    });

    // formatting types
    const formattedTypes = types.map((typeObject) => {
      const newObj = {};

      newObj['slot'] = typeObject.slot;
      newObj['name'] = typeObject.type.name;

      return newObj;
    });

    // type defences
    const typeDefenses = [];
    const defensesSection = $('h2').filter((_i, e) => $(e).text() == 'Type defenses').parent();
    const defensesTable = defensesSection.find('table.type-table tbody tr:nth-child(2) td');
    defensesTable.each((_index, element) => {
      const td = $(element);

      const [attacker, defender, effectivness] = td.attr('title').split(/[→=]/).map((str) => str.trim().toLowerCase());

      typeDefenses.push({
        'attacker': attacker,
        'effectivness': parseEffectiveness(effectivness),
      });
    });

    // formatting stats
    const baseStatTable = $('h2').filter((_i, e) => $(e).text() == 'Base stats').parent().find('table.vitals-table tbody');
    const formattedStats = stats.map((statObject) => {
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

      const statInfo = baseStatTable.find('th').filter((_i, e) => $(e).text() == formattedName).parent();
      const statMax = statInfo.find('td:nth-child(5)');
      const statMin = statInfo.find('td:nth-child(4)');

      newObj['min'] = parseInt(statMin.text());
      newObj['max'] = parseInt(statMax.text());

      return newObj;
    });

    const data = {
      'id': id,
      'name': {
        'name': name,
        'other_languages': localization,
      },
      'pokedex_entry': latestEntry,
      'base_experience': base_experience,
      'height': height,
      'weight': weight,
      'stats': formattedStats,
      'types': formattedTypes,
      'type_defenses': typeDefenses,
      'abilities': formattedAbilities,
    };

    fs.writeFileSync(`./docs/personal/pokemon_${index}.json`, JSON.stringify(data), console.log);
  }
};

/**
 * Scrapes pokemon type matchups from pokemondb.net
 */
async function exportTypematchups() {
  const response = await fetch('https://pokemondb.net/type');
  const html = await response.text();

  const $ = load(html);
  const typeTable = $('table.type-table tbody td');

  const typeMap = {};

  typeTable.each((_index, element) => {
    const td = $(element);

    const [attacker, defender, effectivness] = td.attr('title').split(/[→=]/).map((str) => str.trim().toLowerCase());

    if (typeMap[attacker] == undefined) {
      typeMap[attacker] = {};
    }

    typeMap[attacker][defender] = parseEffectiveness(effectivness);
  });

  fs.writeFile('./docs/type-matchups.json', JSON.stringify(typeMap), console.log);
};

/**
 * Parses effectiveness description into a number.
 *
 * @param {string} _effectiveness
 * @return {number} effectiveness
 */
function parseEffectiveness(effectiveness) {
  switch (effectiveness) {
    case 'super-effective':
      return 2;
    case 'normal effectiveness':
      return 1;
    case 'not very effective':
      return 0.5;
    case 'no effect':
      return 0;
    default:
      throw new Error('unknown effectivness');
  }
};

/**
 * Capitalizeses the given string.
 *
 * @param {string} string
 * @return {string} capitalized string
 */
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}