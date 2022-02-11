import got from 'got'
import {load} from 'cheerio';
import fs from 'fs';
import path from 'path';

(async () => {
  const headers = {Cookie: "timezone=Europe/Berlin"};
  const response = await got.get("https://schedule.hololive.tv/lives/english", {headers}).text();

  const $ = load(response);
  const streamLinks = $('a[href*="youtube.com"]').toArray();

  streamLinks.forEach((element) => {
    const $element = $(element);
    const link = $element.attr("href");
    const time = $element.find("div.datetime").text().trim();
    const name = $element.find("div.name").text().trim();
    const thumbnail = $element.find('img[src*="img.youtube.com"]').attr("src");
    const icon = $element.find('img[src*="yt3.ggpht.com"]').attr("src");

    let $currentContainer = $element.closest("div.container");
    // let $currentContainer = $parentContainer;
    while (!$currentContainer.find("div.holodule.navbar-text").length) {
      $currentContainer = $currentContainer.prev();
    }
    const day = $currentContainer.find("div.holodule.navbar-text").text().trim().substring(0,5);
    
    const data = {link,day,time,name,thumbnail,icon};

    fs.writeFileSync(`./docs/schedule/${name}_${day.replace("/","-")}_${time.replace(":","-")}.json`, JSON.stringify(data), console.log);
  });
})();