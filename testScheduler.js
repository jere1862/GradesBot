const scraper = require('./src.js');

function scrapeGel(){
    scraper.scrape();
    const date = new Date();
    console.log("Job ran at "+date.toDateString());
}

setInterval(scrapeGel, 30*60*1000);

