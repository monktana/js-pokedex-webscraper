import fetch from 'node-fetch';
import { load } from 'cheerio';
import fs from 'fs';

// Pokedex Scrap
(async () => {
  const response = await fetch('https://pokemondb.net/pokedex/national');
  const html = await response.text();

  const $ = load(html);
  const infocards = $('div.infocard-list div.infocard');

  let pokemon = {};
  
  infocards.each((index, element) => {
    const el = $(element);

    pokemon[index] = {
      'name': el.find('a.ent-name').text().toLowerCase(),
      'picture': '',
      'types': el.find('small a.itype').toArray().map((e) => $(e).text().toLowerCase())
    }
  });

  await fs.writeFile('./docs/pokemon.json', JSON.stringify(pokemon), console.log);

})();

// Type Scrap
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

  await fs.writeFile('./docs/typematchups.json', JSON.stringify(typeMap), console.log);
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