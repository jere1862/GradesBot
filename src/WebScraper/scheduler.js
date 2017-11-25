const scraper = require('./index.js');
const schedule = require('node-schedule');
const debug = require('debug')('WebScraper');

let job = schedule.scheduleJob('*/30 * * * *', function(){
    debug('Attempting to run scraping job');
    scraper.scrape();
});

debug("Scraper scheduler started");

