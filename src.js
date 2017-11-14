const puppeteer = require('puppeteer');
const MongoClient = require('mongodb').MongoClient;
const request = require('request');
const _ = require('underscore')

module.exports.scrape = scrape;

var objectDiff = function diff(a,b) {
    var r = {};
    _.each(a, function(v,k) {
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
    innerScrape(process.env.LOGIN, process.env.PASSWORD);
}

async function innerScrape(login, password) {
    console.log("Running web scraper");

    const db = await MongoClient.connect('mongodb://mongo/gelimprover');
    const collection = db.collection('grades');
    
    const browser = await puppeteer.launch({headless: true});
    try{ 
        const page = await browser.newPage();
        await page.goto('http://www.gel.usherbrooke.ca/s4/h17/doc/evaluations/notesEtu.php');
      
        // TODO: Fix the variable score here
        await page.evaluate((gelLogin, gelPassword) => {
            let usernameInput = document.querySelector('#username');
            let passwordInput = document.querySelector('#password');
            
            usernameInput.value = gelLogin;
            passwordInput.value = gelPassword;
            
            const form =  document.querySelector('#authentification');
            
            form.submit.click();
        }, login, password);
        
        await page.waitForSelector('.dojoxGridMasterView');
        
        const gradeMap = await page.evaluate(() => {
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

        const oldGrades = await collection.findOne({}, {'_id': false});

        if(!oldGrades){
            console.log("There were no previous grades, inserting new ones.");
            collection.insertOne(gradeMap);
        }else{
            // Some grades are already there
            console.log("There were previous grades.");
            let diff = Object.diff(gradeMap, oldGrades);
            if(Object.keys(diff).length){
                // There is a new grade!
                console.log("New grades were found! Sending them to the server.");
                collection.replaceOne({}, gradeMap);
                request.post(
                    'http://web-server:8000',
                    {json: {'grades': diff}}
                );
            }
        }
    }catch(err){
        console.error(err);
    }finally{
       await browser.close();
       db.close();
       return
    }
};
