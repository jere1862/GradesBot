const puppeteer = require('puppeteer');
const MongoClient = require('mongodb').MongoClient;
const request = require('request');
const debug = require('debug')('WebScraper');
const _ = require('underscore')

module.exports.scrape = scrape;

var objectDiff = function diff(a,b) {
    var r = {};
    _.each(a, function(v,k) {
        if(!b[k]){
           r[k]=v;
           return;
        }
        if(b[k] === v) return;
        val = _.isObject(v) ? objectDiff(v, b[k]) : v;
        if (!_.isObject(val) || _.keys(val).length>0){
            r[k]=val;
        } 
    });

    return r; 
}

Object.diff = function( x, y ) {
    return objectDiff(x,y); 
};


async function scrape(){
    debug('Booting Web Scraper');
    innerScrape(process.env.LOGIN, process.env.PASSWORD, process.argv[2]);
}

async function innerScrape(username, password, url) {
    const db = await MongoClient.connect('mongodb://mongo/gelimprover');
    const collection = db.collection('grades');
    
    const browser = await puppeteer.launch();
    try{ 
        const page = await browser.newPage();
        debug('Navigating to %s', url); 
 
        await page.goto(url);
        
        let skipLogin = false;
        try{
          await page.waitForSelector('#username');
        } catch(e){
          debug("Couldn\'t find the login page, checking if login was skipped");   
        
          try{
            await page.waitForSelector('.dojoxGridMasterView');
          }finally{
            debug("Did not land on grades page, printing page title");
            await printPageInformation(page);
          }

          skipLogin = true;
        }
      
        if(!skipLogin){
           debug('Reached page successfully, attempting to login with username %s', username); 
                 
           await login(page, username, password);

           await page.waitForSelector('.dojoxGridMasterView');
 
           debug('Login successful, fetching grades')
        }        

        const newGrades = await getGradesFromGel(page);
         
        const oldGrades = await collection.findOne({}, {'_id': false});
        
        newGrades["UneNouvelleNote"] = {"fake exam": "allo"};

        if(!oldGrades){
            debug("There were no previous grades, inserting new ones.");
            collection.insertOne(newGrades);
        }else{
            debug("There were previous grades.");
            let diff = Object.diff(newGrades, oldGrades);
            if(Object.keys(diff).length){
                collection.replaceOne({}, newGrades);
                debug("New grades were found! Sending them to the server.");
                request.post(
                    'http://web-server:8000',
                    {json: {'grades': diff}}
                );
            }else{
                debug('No new grades were found, shutting down');
            }
        }
    }catch(err){
        debug(err);
    }finally{
       await browser.close();
       db.close();
       return
    }
};


async function login(page, username, password) {
    page.evaluate((gelUsername, gelPassword) => {
            let usernameInput = document.querySelector('#username');
            let passwordInput = document.querySelector('#password');
            
            usernameInput.value = gelUsername;
            passwordInput.value = gelPassword;
            
            const form =  document.querySelector('#authentification');
            
            form.submit.click();
          }, username, password);
}


async function getGradesFromGel(page){
    return page.evaluate(() => {
            return (function(document){
                const
                 NUMBER_OF_HEADER_COLUMNS  = 3,
                 COLSPAN_REGEXP            = /colspan="(\d+)"/,
                 IDX_REGEXP                = /idx="(\d+)"/;

                let gridCells = document.getElementsByClassName('dojoxGridCell');

                let gradeCells = [];

                let gridHeaders = getGridHeaders();

                const NUMBER_OF_GRADE_COLUMNS = gridHeaders[0].parentNode.childNodes.length - NUMBER_OF_HEADER_COLUMNS;

                let idxMap = createIdxMap();

                let gradeMap = createResultsMap();
                
                console.log(gradeMap);
                return gradeMap;

                function getGridHeaders(){
                    const 
                     GRADE_CELL_REGEXP    = /^\d+\.?\d*$/,
                     GRID_HEADERS_REGEXP  = /^gridHdr\d+$/;
                    let 
                     gridCell,
                     gridHeaders = [];
                    
                    for(let i = 0; i < gridCells.length; i++){
                        gridCell = gridCells[i];
                        
                        if(!gridCell.children.length && GRADE_CELL_REGEXP.test(gridCell.innerText)){
                            gradeCells.push(gridCell);
                        }
                        if(GRID_HEADERS_REGEXP.test(gridCell.id)){
                            gridHeaders.push(gridCell);
                        }
                    }

                    gridHeaders.splice(0,3);
                    return gridHeaders;
                }

                function createIdxMap(){
                    let
                     idxMap = {},
                     offset = 0,
                     classGrid,
                     classColspanMatcher,
                     classColspan,
                     coursIdx,
                     className;
                    
                    for(let i = 0; i < gridHeaders.length - NUMBER_OF_GRADE_COLUMNS; i++) {
                        classGrid = gridHeaders[i + NUMBER_OF_GRADE_COLUMNS];
                        // No match means that the colspan is 1
                        classColspanMatcher = COLSPAN_REGEXP.exec(classGrid.outerHTML) || [0, 1];
                        classColspan = parseInt(classColspanMatcher[1]);
                        coursIdx = parseInt(IDX_REGEXP.exec(classGrid.outerHTML)[1]);
                        
                        for(let j = 0; j < parseInt(classColspan); j++){
                            idxMap[coursIdx - NUMBER_OF_GRADE_COLUMNS + j + offset] = {
                                className: classGrid.innerText.slice(0, -1),
                                comp: j+1
                            }
                        }
                        
                        offset += (classColspan - 1);
                    }
                    
                    return idxMap;
                }

                function createResultsMap(){
                    let
                     gradeMap = {},
                     grade,
                     gradeIdx,
                     gradeValue,
                     mapRef,
                     typeText;

                    for(let i = 0; i < gradeCells.length; i++){
                        grade = gradeCells[i];
                        gradeIdx = parseInt(IDX_REGEXP.exec(grade.outerHTML)[1]);
                        gradeValue = parseFloat(grade.innerText);
                        
                        if(gradeIdx > NUMBER_OF_HEADER_COLUMNS - 1 
                                && gradeIdx < NUMBER_OF_GRADE_COLUMNS + NUMBER_OF_HEADER_COLUMNS 
                                && gradeValue !== 0){
                            mapRef = idxMap[gradeIdx];
                            
                            if(!gradeMap[mapRef.className]){
                                gradeMap[mapRef.className] = {};
                            }
                            
                            typeText = grade.parentElement.childElements()[0].innerText;
                            
                            if(!gradeMap[mapRef.className][typeText]){
                                gradeMap[mapRef.className][typeText] = {};
                            }
                            
                            if(!gradeMap[mapRef.className][typeText][mapRef.comp]){
                                gradeMap[mapRef.className][typeText][mapRef.comp] = gradeValue;
                            }
                        }
                    }
                    
                    return gradeMap;
                }
            })(document);
        });   
}

async function printPageInformation(page){
    const pageTitle = await page.evaluate(() => {
        return document.getElementsByTagName("title")[0].innerText;
    });
    debug(`Page Title: ${pageTitle}`);
    debug(`Url: ${page.url()}`);

}
