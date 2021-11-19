import fetch from 'node-fetch';
import { load } from 'cheerio';
import fs from 'fs';

// Get all pokemon documents
(async () => {
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
    await fs.writeFile(`./docs/pages/pokemon_${index + 1}.html`, test, console.log);
  }
})();

// Pokedex
(async () => {
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

  await fs.writeFile('./docs/pokemon.json', JSON.stringify(pokemon), console.log);
})();

// Names
(async () => {
  const pokemonFiles = fs.readdirSync('./docs/pages');
  const languages = { };

  for (const [index, file] of pokemonFiles.entries()) {
    const html = fs.readFileSync(`./docs/pages/${file}`, console.log);
    const $ = load(html);

    const nameTable = $('#main > div:nth-child(28) > div:nth-child(1) > div > table.vitals-table > tbody');
    const nameEN = nameTable.find('tr:nth-child(1) td').text().toLowerCase();
    const nameDE = nameTable.find('tr:nth-child(3) td').text().toLowerCase();

    languages[nameEN] = {
      'en': nameEN,
      'de': nameDE,
    };
  }
  await fs.writeFile('./docs/names.json', JSON.stringify(languages), console.log);
})();

// Type matchups
(async () => {
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

  await fs.writeFile('./docs/type-matchups.json', JSON.stringify(typeMap), console.log);
})();

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
}