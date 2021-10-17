import fetch from 'node-fetch';
import { load } from 'cheerio';

(async () => {
  const response = await fetch('https://pokemondb.net/pokedex/national');
  const html = await response.text();

  const $ = load(html);
  console.log($.html());
})()