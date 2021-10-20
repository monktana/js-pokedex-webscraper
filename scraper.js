import fetch from 'node-fetch';
import { load } from 'cheerio';

// Pokedex Scrap
(async () => {
  const response = await fetch('https://pokemondb.net/pokedex/national');
  const html = await response.text();

  const $ = load(html);
  const infocards = $('div.infocard-list div.infocard');

  infocards.each((index, element) => {
    const el = $(element);

    console.log({
      'name': el.find('a.ent-name').text().toLowerCase(),
      'picture': '',
      'types': el.find('small a.itype').toArray().map((e) => $(e).text().toLowerCase())
    })}
  )
})()

// Type Scrap
(async () => {
  const response = await fetch('https://pokemondb.net/type');
  const html = await response.text();

  const $ = load(html);
  const typetable = $('table.type-table');
  const defensetypes = typetable.find('thead tr th a.type-cell').map((index, element) => $(element).attr('title').toLowerCase()).toArray();
  const matchups = typetable.find('tbody tr');
})()