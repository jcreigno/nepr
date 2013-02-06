var mongo = require('mongodb')
  , _ = require('underscore')
  , es = require('event-stream');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

/** join documents to an Array in response stream.*/
var arrayStream = function (){
  var first = true;
  return es.through(function write(data){
      if(first) {
        this.emit('data', '[');
        first = false;
      } else{
        this.emit('data', ',');
      }
      this.emit('data', JSON.stringify(data));
      return true;
    }, function end(){
      if(!first) {
        this.emit('data', ']');
      } else { // emit valid array
        this.emit('data', '[]');
      }
      this.emit('end');
      return true;
    });
};

/**
 * default backend connection.
 */
var def = {
  host : 'localhost',
  port : 27017,
  dbname : 'nepr'
};

module.exports = function(options, readycb) {
  var config = _.defaults(options, def);
  var server = new Server(config.host, config.port, {auto_reconnect: true});
  var db = new Db(config.dbname, server,  {safe:true});

  db.open(function(err, db) {
    if(!err) {
      console.log("Connected to '" + config.dbname + "' database");
    }
    if(readycb){
      readycb(err,db);
    }
  });

  var sendError = function(res, msg, err){
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

  var todayAtMidnight = function () {
    return '2013-02-06T00:00:00.000Z';
  };
  
  var collectionStream = function(name){
    return function(req, res){
      var p = _.pick(req.params, 'env', 'service', 'operation', 'requestid');
      if(!req.query.date){
        p.date = { '$gt': todayAtMidnight() };
      }
      var sort = {date: -1};
      res.setHeader('Content-Type', 'application/json');
      db.collection(name, function(err, col) {
        if(err){
          sendError(res, 'unable to read collection ' + name , err);
        } else {
          col.find(p).sort(sort).stream()
            .pipe(arrayStream())
            .pipe(res);
        }
      });
    };
  };

  return {
    events : function(req, res){
      var entete = {"env": req.params.env
        , "couche": req.params.couche
        , "machine": req.params.machine
      };

      var eventsByType = _.reduce(req.body, function(memo, msg){
        if(!memo[msg.type]){
          memo[msg.type] = [];
        }
        memo[msg.type].push(_.defaults(msg, entete));
        return memo;
      }, {});

      Object.keys(eventsByType).forEach(function(type){
        db.collection(type, function(err, col) {
          col.insert(eventsByType[type], function(err, result) {
            if (err) {
              console.log('unable to insert perfs message : %s - %s', err);
            } else{
              console.log('%d inserts.', result.length);
            }
          });
        });
      });
      res.send(200);
    },
    errors : collectionStream('error'),
    perfs : collectionStream('perf'),
    stats : function(req, res) {
      var p = _.pick(req.params, 'env', 'service', 'operation');
      if(!req.query.date){
        p.date = { '$gt': todayAtMidnight() };
      }

      // Group By 'service, operation'
      var mapFn = function() {
        emit({
          service : this.service,
          operation : this.operation,
          couche : this.couche
        }, {
          count : 1,
          elapsed : this.elapsed
        });
      };

      // Agregate elapsed time
      var reduceFn = function(key, values) {
        var result = { count : 0, elapsed : 0};
        values.forEach(function(val) {
          result.count += val.count;
          result.elapsed += val.elapsed;
        });
        return result;
      };

      db.collection('perf', function(err, col) {
        var options = {
          'query' : p,
          'finalize' : function(key, value) { // Calculate average
            value.average = value.elapsed / value.count;
            return value;
          },
          'out' : { inline : 1}
        };
        col.mapReduce(mapFn, reduceFn, options, function(err, rescoll) {
          if(err){
            sendError(res, 'unable to read stats.' , err);
          }else{
            res.setHeader('Content-Type', 'application/json');
            res.send(rescoll);
            res.end();
          }
        });
      });
    }
  };
};
