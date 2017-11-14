const express = require('express')
const app = express();
const bodyParser =  require('body-parser');

app.use(express.json());

app.post('/', function(req, res) {
    console.log(req.body.grades);
    res.send('Received your data!');
})

var server = app.listen(8000, function(){
    const host = server.address().address;
    const port = server.address().port;

    console.log("App listening at http://%s:%s", host, port)
});