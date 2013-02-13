
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

var config = require(path.join(__dirname, './config.json'));
var routes = data(config.db);

app.get('/stats/:env', routes.stats);
app.get('/stats/:env/:service', routes.stats);
app.get('/stats/:env/:service/:operation', routes.stats);

app.get('/perfs/:env/:service', routes.perfs);
app.get('/perfs/:env/:service/:operation', routes.perfs);

app.get('/errors/:env', routes.errors);
app.get('/errors/:env/:service', routes.errors);
app.get('/errors/:env/:service/:operation', routes.errors);

app.get('/traces/:env/:requestid', routes.perfs);
app.get('/traces/:env', function(req, res){
  res.setHeader('Content-Disposition','attachment; filename="perfs-' + req.params.env + '.csv"');
  routes.perfsCSV(req, res);
});
  

app.post('/data/:env/:couche/:machine', routes.events);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
