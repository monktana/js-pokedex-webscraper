import fetch from 'node-fetch';
import { load } from 'cheerio';
import fs from 'fs';

const POKEMON_COUNT = 898;

// Get all pokemon documents from pokemondb
async function downloadPokemondocuments() {
  const base = 'https://pokemondb.net';

  const response = await fetch(`${base}/pokedex/national`);
  const html = await response.text();

  const $ = load(html);
  const infocards = $('div.infocard-list div.infocard');

  const pokemonPages = [];

  for (const [index, infocard] of infocards.toArray().entries()) {
    const el = $(infocard);
    const pokemonURI = el.find('div.infocard span.infocard-lg-img a').attr('href');
    const pokemonPage = await fetch(`${base}${pokemonURI}`);

    pokemonPages.push(pokemonPage);
  }

  for (const [index, page] of pokemonPages.entries()) {
    const test = await page.text();
    fs.writeFile(`./docs/pokemondb/pokemon_${index + 1}.html`, test, console.log);
  }
};

// Get all pokemon documents from pokeapi
async function downloadPokemonJSON() {
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

// Combine pokemondb data with pokeAPI data
function combineData() {
  for (let index = 1; index <= POKEMON_COUNT; index++) {
    const pokemonDBData = fs.readFileSync(`./docs/pokemondb/pokemon_${index}.html`, console.log);
    const $ = load(pokemonDBData);

    const pokeApiData = JSON.parse(fs.readFileSync(`./docs/pokeAPI/pokemon_${index}.json`, console.log));
    let {id, name, stats, types, weight, abilities, base_experience, height} = pokeApiData;

    // pokedex entry
    const pokedexEntry = $('h2').filter((_i,e) => $(e).text() == 'Pokédex entries').next().find('table.vitals-table tbody tr:last-child td').text();

    // localization
    let localization = [];
    const nameTable = $('h2').filter((_i,e) => $(e).text() == 'Other languages').parent().find('table.vitals-table tbody tr');
    nameTable.each((_index, row) => {
      const languages = $(row).find('th').text().toLowerCase().split(', ');
      const name = $(row).find('td').text().toLowerCase();

      languages.forEach(language => localization.push({'language': language, 'name': name}));
    });

    // formatting types
    const formattedAbilities = abilities.map(abilityObject => {
      let newObj = {};

      newObj['slot'] = abilityObject.slot;
      newObj['is_hidden'] = abilityObject.is_hidden;
      newObj['name'] = abilityObject.ability.name;

      return newObj;
    });

    // formatting types
    const formattedTypes = types.map(typeObject => {
      let newObj = {};

      newObj['slot'] = typeObject.slot;
      newObj['name'] = typeObject.type.name;

      return newObj;
    });

    //type defences
    const typeDefenses = [];
    const defensesTable = $('h2').filter((_i,e) => $(e).text() == 'Type defenses').parent().find('table.type-table tbody tr:nth-child(2) td');
    defensesTable.each((_index, element) => {
      const td = $(element);
      
      const [attacker, defender, effectivness] = td.attr('title').split(/[→=]/).map(str => str.trim().toLowerCase());
  
      typeDefenses.push({
        'attacker': attacker,
        'effectivness': parseEffectiveness(effectivness)
      });
    })

    // formatting stats
    const baseStatTable = $('h2').filter((_i,e) => $(e).text() == 'Base stats').parent().find('table.vitals-table tbody');
    const formattedStats = stats.map(statObject => {
      let newObj = {};

      newObj['base_stat'] = statObject.base_stat;
      newObj['effort'] = statObject.effort;
      newObj['name'] = statObject.stat.name;

      let formattedName = '';

      if (statObject.stat.name == 'special-attack') {
        const parts = statObject.stat.name.split('-');
        let prefix = capitalize(parts[0]).substring(0,2);
        let postfix = capitalize(parts[1]).replace('tac', '');

        formattedName = `${prefix}. ${postfix}`;
      } else if (statObject.stat.name == 'special-defense') {
        const parts = statObject.stat.name.split('-');
        let prefix = capitalize(parts[0]).substring(0,2);
        let postfix = capitalize(parts[1]).substring(0,3);

        formattedName = `${prefix}. ${postfix}`;
      } else if (statObject.stat.name == 'hp') {
        formattedName = statObject.stat.name.toUpperCase();
      } else {
        formattedName = capitalize(statObject.stat.name);
      }

      const statInfo = baseStatTable.find('th').filter((_i,e) => $(e).text() == formattedName).parent();
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
        'other_languages': localization
      },
      'pokedex_entry': pokedexEntry,
      'base_experience': base_experience,
      'height': height,
      'weight': weight,
      'stats': formattedStats,
      'types': formattedTypes,
      'type_defenses': typeDefenses,
      'abilities': formattedAbilities
    };

    fs.writeFileSync(`./docs/personal/pokemon_${index}.json`, JSON.stringify(data), console.log);
  }
};

// Pokedex
function getPokemonData() {
  const pokemonFiles = fs.readdirSync('./docs/pages');
  const pokemon = {};

  for (const [index, file] of pokemonFiles.entries()) {
    const html = fs.readFileSync(`./docs/pages/${file}`, console.log);
    const $ = load(html);

    const infoTable = $('div.sv-tabs-panel.active div.grid-col.span-md-6.span-lg-4 table.vitals-table tbody');
    const dexNumber = parseInt(infoTable.find('tr:nth-child(1) td strong').text());

    pokemon[dexNumber] = {
      'name': $('h1').text().toLowerCase(),
      'picture': $('a[rel=lightbox]').attr('href'),
      'types': infoTable.find('tr:nth-child(2) td a').toArray().map((e) => $(e).text().toLowerCase())
    };
  }

  fs.writeFile('./docs/pokemon.json', JSON.stringify(pokemon), console.log);
};

// Names
async function exportNames() {
  const pokemonFiles = fs.readdirSync('./docs/pages');
  const de = { };
  const en = { };

  for (const [index, file] of pokemonFiles.entries()) {
    const html = fs.readFileSync(`./docs/pages/${file}`, console.log);
    const $ = load(html);

    const nameTable = $('h2').filter((_i,e) => $(e).text() == 'Other languages').parent().find('table.vitals-table')

    const nameEN = nameTable.find('tr:nth-child(1) td').text().toLowerCase();
    const nameDE = nameTable.find('tr:nth-child(3) td').text().toLowerCase();

    de[nameDE] = nameDE;
    en[nameEN] = nameEN;
  }

  fs.writeFile('./docs/languages/de.json', JSON.stringify(de), console.log);
  fs.writeFile('./docs/languages/en.json', JSON.stringify(en), console.log);
};

// Type matchups
async function exportTypematchups() {
  const response = await fetch('https://pokemondb.net/type');
  const html = await response.text();

  const $ = load(html);
  const typetable = $('table.type-table tbody td');

  let typeMap = {};

  typetable.each((index, element) => {
    const td = $(element);
    
    const [attacker, defender, effectivness] = td.attr('title').split(/[→=]/).map(str => str.trim().toLowerCase());

    if (typeMap[attacker] == undefined) {
      typeMap[attacker] = {}
    }

    typeMap[attacker][defender] = parseEffectiveness(effectivness);
  })

  fs.writeFile('./docs/type-matchups.json', JSON.stringify(typeMap), console.log);
};

function parseEffectiveness(effectivness) {
  switch (effectivness) {
    case 'super-effective':
      return 2;
    case 'normal effectiveness':
      return 1;
    case 'not very effective':
      return 0.5;
    case 'no effect':
      return 0;
    default:
      throw new Error();
  }
};

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}