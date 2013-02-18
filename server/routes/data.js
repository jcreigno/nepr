var mongo = require('mongodb'),
  _ = require('underscore'),
  iso8601 = require('../lib/ISO8601'),
  jsonStream = require('../lib/JSONArrayStream'),
  csvStream = require('../lib/CSVStream');

var Server = mongo.Server,
  Db = mongo.Db,
  BSON = mongo.BSONPure;

/**
 * default backend connection.
 */
var def = {
  host: 'localhost',
  port: 27017,
  dbname: 'nepr'
};

module.exports = function (options, readycb) {
  var config = _.defaults(options, def);
  var server = new Server(config.host, config.port, {
    auto_reconnect: true
  });
  var db = new Db(config.dbname, server, {
    safe: true
  });

  db.open(function (err, db) {
    if (!err) {
      console.log("Connected to '" + config.dbname + "' database");
    }
    if (readycb) {
      readycb(err, db);
    }
  });

  var sendError = function (res, msg, err) {
    var body = JSON.stringify({
      'message': msg,
      'error': err
    });
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Content-Length': body.length
    });
    res.write(body);
    res.end();
  };

  var predicateFromQuery = function (req) {
    var p = _.pick(req.params, 'env', 'service', 'operation', 'requestid');
    p.date = {
      '$gte': iso8601.date.start(req.query.startingDate),
      '$lte': iso8601.date.end(req.query.endingDate)
    };
    return p;
  };

  var collectionStream = function (name, outputFormat) {
    var output = outputFormat || jsonStream();
    return function (req, res) {
      var p = predicateFromQuery(req);
      var sort = {
        date: -1
      };
      db.collection(name, function (err, col) {
        if (err) {
          sendError(res, 'unable to read collection ' + name, err);
        }
        else {
          output.writeHeaders(req, res);
          col.find(p).sort(sort).stream().pipe(output.stream()).pipe(res);
        }
      });
    };
  };

  return {
    events: function (req, res) {
      var entete = {
        "env": req.params.env,
        "couche": req.params.couche,
        "machine": req.params.machine
      };

      var eventsByType = _.reduce(req.body, function (memo, msg) {
        if (!memo[msg.type]) {
          memo[msg.type] = [];
        }
        memo[msg.type].push(_.defaults(msg, entete));
        return memo;
      }, {});

      Object.keys(eventsByType).forEach(function (type) {
        db.collection(type, function (err, col) {
          col.insert(eventsByType[type], function (err, result) {
            if (err) {
              console.log('unable to insert perfs message : %s - %s', err);
            }
            else {
              console.log('%d inserts.', result.length);
            }
          });
        });
      });
      res.send(200);
    },
    errors: collectionStream('error'),
    perfs: collectionStream('perf'),
    perfsCSV: collectionStream('perf', csvStream(function (item) {
      return [item.requestid,
      item.date,
      item.couche,
      item.service,
      item.operation,
      item.elapsed].join(';');
    })),
    stats: function (req, res) {
      var p = predicateFromQuery(req);

      // Group By 'service, operation'
      var mapFn = function () {
        emit({
          service: this.service,
          operation: this.operation,
          couche: this.couche
        }, {
          count: 1,
          elapsed: this.elapsed
        });
      };

      // Agregate elapsed time
      var reduceFn = function (key, values) {
        var result = {
          count: 0,
          elapsed: 0
        };
        values.forEach(function (val) {
          result.count += val.count;
          result.elapsed += val.elapsed;
        });
        return result;
      };

      db.collection('perf', function (err, col) {
        var options = {
          'query': p,
          'finalize': function (key, value) { // Calculate average
            value.average = value.elapsed / value.count;
            return value;
          },
          'out': {
            inline: 1
          }
        };
        col.mapReduce(mapFn, reduceFn, options, function (err, rescoll) {
          if (err) {
            sendError(res, 'unable to read stats.', err);
          }
          else {
            res.setHeader('Content-Type', 'application/json');
            res.send(rescoll);
            res.end();
          }
        });
      });
    }
  };
};
