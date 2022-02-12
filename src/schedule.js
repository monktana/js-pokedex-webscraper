import got from 'got'
import {load} from 'cheerio';
import moment from 'moment';
import fs from 'fs';

(async () => {
  const headers = {Cookie: "timezone=UTC"};
  const response = await got.get("https://schedule.hololive.tv/lives/english", {headers}).text();

  const $ = load(response);
  const streamLinks = $('a[href*="youtube.com"]').toArray();

  const today = moment().startOf('day');

  const runs = {}

  await Promise.all(streamLinks.map(async (element) => {
    const $element = $(element);

    const time = $element.find("div.datetime").text().trim();
    let $currentContainer = $element.closest("div.container");
    while (!$currentContainer.find("div.holodule.navbar-text").length) {
      $currentContainer = $currentContainer.prev();
    }

    const day = $currentContainer.find("div.holodule.navbar-text").text().trim().substring(0,5);
    const dateString = `${moment().year()}-${day.replace("/","-")} ${time}:00Z`;
    const date = moment(dateString)

    if (!date.startOf('day').isSame(today)) {
      return Promise.resolve();
    }

    const link = $element.attr("href");
    const style = $element.attr("style");
    const isLive = /border:.*red/.test(style);
    const name = $element.find("div.name").text().trim();
    const thumbnail = $element.find('img[src*="img.youtube.com"]').attr("src");
    const icon = $element.find('img[src*="yt3.ggpht.com"]').attr("src");

    const streamPage = await got.get(link).text();
    const $yt = load(streamPage);
    const title = $yt("title").text().replace(" - YouTube", "").trim();
    
    const data = {date,isLive,title,link,thumbnail,icon};
    
    if (!runs[name]) {
      runs[name] = [];
    }

    runs[name].push(data);

  }));
  fs.writeFileSync(`./docs/schedule/runs.json`, JSON.stringify(runs), console.log);
})();