#!/usr/bin/env node


/*jslint node: true */
'use strict';

var request = require ('request')
  , winston = require('winston')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , NeprClient = require('../lib/NeprClient');

/**
 * define logger.
 */
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: './nepr-client.log' })
    ]
});

var optimist = require('optimist');
var argv = optimist
  .usage(['Start nepr-client.',
    ' Usage: $0 --env [env] --type [type] [url]',
    ' Usage: $0 --config [config]'].join('\n'))
  .options('env', {
    description: 'execution environnement name.',
    alias: 'e'
  }).option('type', {
    description: 'execution environnement classifier.',
    alias: 't'
  }).option('throttle', {
    description: 'data upload delay in milliseconds.',
    default: 200
  }).option('reload', {
    description: 'remote configuration reloading delay in milliseconds.',
    default: 1800000
  }).option('config', {
    description: 'json configuration.',
    alias: 'c'
  })
  .argv;
  
if(argv._.length === 0 && !argv.config){
  optimist.showHelp();
  process.exit(-1);
}



/**
  read configuration from config file or command line.
 */
function buildconfig(argv){
  var config;
  if(argv.config){
    config = require(argv.config);
  } else{
    config = { env : argv.env
       , type : argv.type
       , throttle : argv.throttle
       , reload : argv.reload
       , serverconfig : { 
          url : argv._[0]
       }
    };
  }
  return config;
}

/**
 * client configuration.
 */
var config = buildconfig(argv);

/**
 * default error handler.
 */
process.on('uncaughtException', function(err) {
  logger.error(err);
});

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
  return './' + v + '.js';
}

/**
 * current remote config version.
 */
var configVersion;

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
  remoteCfgStream.once('close', function(){
    fs.rename(localConfig, configFile(newVersion), function rename (err) {
        callback(err, newVersion);
    });
  });
  var headers = {};
  if(version){
    headers['If-None-Match'] = version;
  }
  request({'url':url, 'headers':headers}, function (error, response) {
    //console.dir(response);
    if (!error && response.statusCode === 200) {
      newVersion = response.headers.etag;
      if(newVersion){
        newVersion = newVersion.replace(/"/g,'');
      }
    } else{
      remoteCfgStream.removeAllListeners('close');
      callback(error || new Error('error retrieving remote configuration : ' + response.statusCode));
    }
  }).pipe(remoteCfgStream);
  return ;
}

/**
 * start Nepr Client with current remote-config.
 */
function start(){
  logger.info('starting nepr client.');
  client.start(require(path.resolve(configFile(configVersion))));
}

/**
 * stop current Nepr Client.
 */
function stop(){
  logger.info('stoping nepr client.');
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
  retreiveConfiguration(configVersion, function(err, newVersion){
    if(err){
      logger.error('unable to retrieve remote configuration. ' + err);
    } else {
      configVersion = newVersion;
      start();
    }
  });
  var interval = config.reload || (30 * 60 * 1000);
  setInterval(function(){
    retreiveConfiguration(configVersion, function(err, newVersion){
      if(err){
        logger.error('unable to retrieve remote configuration. ' + err);
      } else if(newVersion !== configVersion){
        logger.info('loading new configuration : %s', newVersion);
        stop();
        configVersion = newVersion;
        start();
      }
    });
  }, interval);
  logger.info('reloading remote config every %d ms', interval);
}

