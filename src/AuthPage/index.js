const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const CASAuthentication = require('cas-authentication');
const logger = require('./logger');

const cas = new CASAuthentication({
    cas_url         : 'https://cas.usherbrooke.ca',
    service_url     : 'http://localhost:8080',
    cas_version     : '2.0',
    renew           : false,
    is_dev_mode     : false,
    dev_mode_user   : '',
    dev_mode_info   : {},
    session_name    : 'cas_user',
    session_info    : 'cas_userinfo',
    destroy_session : false 
});

app.use(session({
    secret            : 'super secret key',
    resave            : false,
    saveUninitialized : true
}));

app.use(express.static('public'));

app.get('/', cas.bounce, function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/authenticate', cas.bounce_redirect);

app.get('/api/user', cas.block, function (req, res) {
    res.json( { cas_user: req.session[ cas.session_name ] } );
});

app.get('/logout', cas.logout);

app.listen(8080, () => {
    logger.info('Listening on port %d', 8080);
});
