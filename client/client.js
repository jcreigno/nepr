/*jslint node: true */
'use strict';

var request = require ('request')
  , winston = require('winston')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , NeprClient = require('./lib/NeprClient');

/**
 * define logger.
 */
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)()/*,
      new (winston.transports.File)({ filename: 'nepr-client.log' })*/
    ]
});

/**
 * default error handler.
 */
//process.on('uncaughtException', function(err) {
//  logger.error(util.inspect(err));
//});

/**
 * current working directory : __dirname or argv[2]
 */
var basedir = process.argv[2] || __dirname;
logger.info('working directory : ' + basedir);

/**
 * default local configuration filename.
 */
var DEFAULT_LOCAL = 'remote-config';

/**
 * build remote config local filename in working directory.
 * @param version : current remote config version.
 */
function configFile(version){
  var v = version || DEFAULT_LOCAL;
  return path.join(basedir, v + '.js');
}

/**
 * current remote config version.
 */
var configVersion;
/**
 * client configuration.
 */
var config = require(path.join(basedir, 'config.json'));
config.logger = logger;
/**
 * Nepr Client.
 */
var client = new NeprClient(config);

/**
 * retrieve new remote configuration if a newer is avaliable.
 * @param version : current remote config version identifier.
 * @param callback : called if there is new remote config version.
 */
function retreiveConfiguration (version, callback){
  var newVersion = version;
  var url = [config.serverconfig.url
    , 'conf'
    , config.env
    , config.type
    , 'config.js'].join('/');

  var localConfig = configFile();
  var remoteCfgStream = fs.createWriteStream(localConfig);
  remoteCfgStream.on('close', function(){
    fs.rename(localConfig, configFile(newVersion), function rename () {
        callback(newVersion);
    });
  });
  var headers = {};
  if(version){
    headers['If-None-Match'] = version;
  }
  request({'url':url, 'headers':headers}, function (error, response) {
    if (!error && response.statusCode === 200) {
      newVersion = response.headers.etag;
    }
  }).pipe(remoteCfgStream);
  return ;
}

/**
 * start Nepr Client with current remote-config.
 */
function start(){
  client.start(require(configFile(configVersion)));
}

/**
 * stop current Nepr Client.
 */
function stop(){
  var filename = configFile(configVersion);
  client.stop();
  fs.unlink(filename, function (err) {
    if (err){
      logger.info('unable to delete ' + filename);
    }
  });
  delete require.cache[filename];
}


if(config.offline) { // offline
  logger.info('offline mode...');
  configVersion = DEFAULT_LOCAL;
  start();
} else { // online : retrieve match config
  retreiveConfiguration(configVersion, function(newVersion){
    configVersion = newVersion;
    start();
  });
  var interval = config.reload || (30 * 60 * 1000);
  setInterval(function(){
    retreiveConfiguration(configVersion, function(newVersion){
      if(newVersion !== configVersion){
        logger.info('reloading configuration');
        stop();
        configVersion = newVersion;
        start();
      }
    });
  }, interval);
  logger.info('reloading remote config every ' + interval + ' ms');
}

