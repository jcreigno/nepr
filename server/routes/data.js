var mongo = require('mongodb'), _ = require('underscore');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

/**
 * default backend connection.
 */
var def = {
  host : 'localhost',
  port : 27017,
  dbname : 'nepr'
};

module.exports = function(options) {
  
  var config = _.defaults(options, def);
  var server = new Server(config.host, config.port, {auto_reconnect: true});
  db = new Db(config.dbname, server);

  db.open(function(err, db) {
    if(!err) {
      console.log("Connected to '" + config.dbname + "' database");
    }
  });
 
	
  return {
    addEvents : function(req, res){
      var entete = {"env": req.params.env
        , "couche": req.params.couche
        , "machine": req.params.machine
      };

      var eventsByType = {};
      _.reduce(req.body, function(memo, msg){ 
        if(!memo[msg.type]){
          memo[msg.type] = [];
        }
        return memo[msg.type].push(_.defaults(msg, entete));
      },eventsByType);

      Object.keys(eventsByType).forEach(function(type){
        db.collection(type, function(err, col) {
		      col.insert(eventsByType[type], { safe : true }, function(err, result) {
			      if (err) {
				      console.log('enable to insert perfs message : %s', perf);
			      }
          });
	      });        
      });
      res.send(200);
    },
    addError : function(error){
    }
    
  
  };

};
