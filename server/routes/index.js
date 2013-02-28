var data = require('./data')
  , CSVStream = require('../lib/CSVStream');


var jsonheader = function(req, res, next){
  res.setHeader('Content-Type', 'application/json');
  next();
};

var csvheader = function(req, res, next){
  res.setHeader('Content-Type', 'text/csv');  
  res.setHeader('Content-Disposition','attachment; filename="perfs-' + req.params.env + '.csv"');
  next();
};



module.exports = function(opts){
  var documents = data(opts);

  /**
    define routes on express instance.
    @param {Express.application} instance express
  */
  function configureRoutes(app) {
    var stats = documents.stats(['env', 'service', 'operation']);
    app.get('/stats/:env', stats);
    app.get('/stats/:env/:service', stats);
    app.get('/stats/:env/:service/:operation', stats);

    var errors = [jsonheader , documents.stream('error', ['env', 'service', 'operation'])];
    app.get('/errors/:env', errors);
    app.get('/errors/:env/:service', errors);
    app.get('/errors/:env/:service/:operation', errors);

    var perfs = [jsonheader, documents.stream('perf', ['env', 'service', 'operation'])];
    app.get('/perfs/:env/:service', perfs);
    app.get('/perfs/:env/:service/:operation', perfs);

    app.get('/traces/:env/:requestid', jsonheader, documents.stream('perf', ['env', 'requestid']));

    var tracesCSV = documents.stream('perf', ['env'], CSVStream.stringify(function (item) {
          return [item.requestid,
          item.date,
          item.couche,
          item.service,
          item.operation,
          item.elapsed].join(';');
        })
    );
    app.get('/traces/:env', csvheader, tracesCSV);
      

    app.post('/data/:env/:couche/:machine', documents.events);
  }

  return {
    configure : configureRoutes
  };
};
