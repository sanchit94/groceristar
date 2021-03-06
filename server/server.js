// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-example-passport
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT
'use strict';

const loopback     = require('loopback');
const boot         = require('loopback-boot');
const cookieParser = require('cookie-parser');
const session      = require('express-session');

const path         = require('path');
const express      = require('express');

const errorhandler = require('errorhandler');

// i use this name in order to keep away from name convig
// const cfg          = require('config.staging.js');

const Raven        = require('raven');
// Raven.config(cfg.RAVEN_KEY).install();
Raven.config('https://6c8ba2737aae4d81908677e4dba9be3f:26c83aa1a38a42cdbf0beea41a82cacf@sentry.io/231031').install();

var app            = module.exports = loopback();


// console.log(app.datasources);
// const cfg = require('../../server/config.staging.js');
// Raven.config(cfg.RAVEN_KEY).install();



// Passport configurators..
const loopbackPassport   = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

/*
 * body-parser is a piece of express middleware that
 *   reads a form's input and stores it as a javascript
 *   object accessible through `req.body`
 *
 */
// const bodyParser = require('body-parser');

/**
 * Flash messages for passport
 *
 * Setting the failureFlash option to true instructs Passport to flash an
 * error message using the message given by the strategy's verify callback,
 * if any. This is often the best approach, because the verify callback
 * can make the most accurate determination of why authentication failed.
 */
const flash      = require('express-flash');

// attempt to build the providers/passport config
var config = {};

try {

  if ( process.env.NODE_ENV === 'development' || !process.env.NODE_ENV ) {
    // only use in development
    config = require('../providers.json');
  } else {
    config = require('../providers.production.json');
  }

  // console.log(config);
} catch (err) {
  console.trace(err);
  Raven.captureException(err);
  process.exit(1); // fatal
}






// -- Add your pre-processing middleware here --

// Setup the view engine (pug)
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'pug');
app.set('json spaces', 2); // format json responses for easier viewing

// in client/public we store static files right now.
var staticDir = path.join(__dirname + '/../client/public');
app.use(express.static(staticDir));

if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorhandler());
}

// boot scripts mount components like REST API
boot(app, __dirname);


// to support JSON-encoded bodies
// app.middleware('parse', bodyParser.json());
// to support URL-encoded bodies
// app.middleware('parse', bodyParser.urlencoded({
//   extended: true,
// }));


// The access token is only available after boot
app.middleware('auth', loopback.token({
  model: app.models.accessToken, // :todo change this when we'll update model names
}));


app.middleware('session:before', cookieParser(app.get('cookieSecret')));
app.middleware('session', session({
  secret: 'kitty',
  saveUninitialized: true,
  resave: true,
}));

passportConfigurator.init();


// We need flash messages to see passport errors
app.use(flash());






passportConfigurator.setupModels({
  userModel:           app.models.user,
  userIdentityModel:   app.models.userIdentity,
  userCredentialModel: app.models.userCredential,
});

for (var s in config) {
  var c = config[s];
  c.session = c.session !== false;
  passportConfigurator.configureProvider(s, c);
}


app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
