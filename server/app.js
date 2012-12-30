
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , data = require('./routes/data')
  , http = require('http')
  , path = require('path');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('title', 'Nep.R');
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//app.get('/stats/:env/:service', routes.index);
//app.get('/stats/:env/:service/:opera', routes.index);

//app.get('/perfs/:env/:service', routes.index);
//app.get('/perfs/:env/:service/:opera', routes.index);

//app.get('/errors/:env', routes.index);

//app.get(/traces/:env/:requestid', routes.index);
//app..get('/traces/:env', routes.index);

app.post('/data/:env/:couche/:machine', data.addEvents);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
