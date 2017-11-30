const express = require('express')
const app = express();
const bodyParser = require('body-parser');
const request = require('request');

app.use(express.json());

app.get('/', function(req, res) {
    sendMessage(1013438942027043, {"text": "Test le bot"});
    res.status(200).send('Hello!');
});

app.post('/', function(req, res) {
    sendMessage(1013438942027043, {"text": "Nouvelle note!\n"+Object.keys(req.body.grades)[0]+'\n'+'http://www.gel.usherbrooke.ca/s5info/a17/doc/evaluations/notesEtu.php'});
    res.send('Received your data!');
});

app.get('/webhook', (req, res) => {
  let VERIFY_TOKEN = process.env.API_KEY
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }else{
      console.log('Token and mode don\'t exist!');
  }
});

app.post('/webhook', function(req, res) {
    const token = process.env.API_KEY;
    let body = req.body;
    
    if(body.object === 'page'){
        body.entry.forEach(function(entry){
            let webhookEvent = entry.messaging[0];

            let senderPSID = webhookEvent.sender.id;
        });

        res.status(200).send('EVENT_RECEIVED');
    }else{
        res.sendStatus(404);
    }

});

function sendMessage(psid, message){
    let requestBody = {
        "recipient": {
            "id": psid   
        },
        "message": message
    }
    request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.API_KEY },
    "method": "POST",
    "json": requestBody
  }, (err, res, body) => {
    if (!err) {
      console.log(psid);
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

var server = app.listen(8000, function(){
    const host = server.address().address;
    const port = server.address().port;

    console.log("App listening at http://%s:%s", host, port)
});

