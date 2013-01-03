/*jslint node: true */
'use strict';
var extractor = require('file-extractor')
    , request = require ('request')
    , winston = require('winston')
    , os = require('os')
    , _ = require('underscore');

/**
  Construct a new NeprClient.
  @constructor
  @param {object-literal} config any configuration
 */
function NeprClient (config){
  var self = this;
  // active extractors
  self.extractors = [];
  self.logger = config.logger ||  winston;
  self.throttle = config.throttle || 200;
  var post = [ config.serverconfig.url
    , 'data'
    , config.env
    , config.type
    , os.hostname() ].join('/');
  self.client = request.defaults({url: post, 'json': true});

  /**
   send data to NeprServer and throttle calls. This method expects 2 arrays in {vars} : 
   {lines} and {errors}.
   @param {object-literal} vars extracted data.
  */
  self.send = _.throttle(function sendPerfData (vars){
        var data = vars.lines.splice(0, vars.lines.length);
        var errors = vars.errors.splice(0, vars.errors.length);
        data = data.concat(errors);
        self.client.post({body:data},
          function(err, res){
            if(err){
              self.logger.error(err);
              self.logger.error(res);
            }
          });
      }, self.throttle);
}



/**
  start watching files for modification, send matching lines to NeprServer.
  @param {object-literal} remote configuration
 */
NeprClient.prototype.start = function (remote){
  var self = this;
  //self.configVersion =  version;
  // remote config is ready lets play !
  //var remote = require(path.join(basedir, configVersion));
  Object.keys(remote).forEach(function (file) {
    var e = extractor({lines:[], errors:[], timer: null});
    self.extractors.push(e);
    self.logger.info(file + ' :');
    Object.keys(remote[file]).forEach(function (regexp){
      self.logger.info(' ✓ pattern : ' + regexp);
      e.matches(new RegExp(regexp), function(m, vars, f){
        remote[file][regexp](m, vars, f);
        self.send(vars);
      });
    });
    e.watch(file);
  });
};


/**
  stop watching files. clear any file watcher.
 */
NeprClient.prototype.stop = function (){
  var self = this;
  self.extractors.forEach(function(e){
    e.close();
  });
  self.extractors.splice(0, 0);
  self.logger.info('stop watching');
};

module.exports = function(ac){
    return new NeprClient(ac);
};

