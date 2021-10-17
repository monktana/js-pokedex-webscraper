import fetch from 'node-fetch';
import { load } from 'cheerio';

(async () => {
  const response = await fetch('https://pokemondb.net/pokedex/national');
  const html = await response.text();

  const $ = load(html);
  const infocards = $('div.infocard-list div.infocard');

  infocards.each((i, el) => {
    const e = $(el);

    console.log({
      'name': e.find('a.ent-name').text().toLowerCase(),
      'picture': '',
      'types': e.find('small a.itype').toArray().map((el) => $(el).text().toLowerCase())
    })}
  )
})()
