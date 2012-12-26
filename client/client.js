var extractor = require('file-extractor')
  , request = require ('request')
  , _ = require('underscore')
  , winston = require('winston')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , os = require("os")
  , config = require('./config');

/**
 * define logger.
 */
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: 'nepr-client.log' })
    ]
});

/**
 * default error handler.
 */
process.on('uncaughtException', function(err) {
  logger.error(util.inspect(err));
});

// active extractors
var extractors = [];
// current config version
var configVersion;
// post client default config
var client = request.defaults({'json': true});
// post url
var POST_URL = [ config.serverconfig.url
  , 'data'
  , config.env
  , config.type
  , os.hostname() ].join('/');

function retreiveConfiguration (version, cb){
  var newVersion = version;
  var url = [config.serverconfig.url
    , 'conf'
    , config.env
    , config.type
    , 'config.js'].join('/');

  var remoteCfgStream = fs.createWriteStream('remote-config.js');
  remoteCfgStream.on('close', function(){
  fs.rename('remote-config.js', newVersion + '.js',
    function rename (){
      cb(newVersion);
    });
  });
  var headers = {};
  if(version){
    headers['If-None-Match'] = version;
  }
  request({'url':url,'headers':headers}, function (error, response) {
    if (!error && response.statusCode === 200) {
      newVersion = response.headers.etag;
    }
  }).pipe(remoteCfgStream);
  return ;
}


// throttled send method
var send = _.throttle(function sendPerfData (vars){
  //console.log('sending  %d length ',vars.lines.length);
  var data = vars.lines.splice(0, vars.lines.length);
  var errors = vars.errors.splice(0, vars.errors.length);
  data = data.concat(errors);
  client.post({url:POST_URL, body:data}, function(err, res){
    if(err){
      logger.error(util.inspect(err));
      logger.error(util.inspect(res));
    }
  });
}, config.throttle || 200);

/**
 * handle wildcards in filenames
 */
function wildcards(f, ctxt, cb){
  var starmatch = f.match(/(.*)\*.*/);
  if(!starmatch){
    return process.nextTick(function(){ cb.apply(ctxt,[f]); });
  }
  var basedirPath = starmatch[1].split(/\//);
  basedirPath.pop();
  var files = [];
  var finder = require('walkdir').find(basedirPath.join('/'));
  finder.on('file', function (file) {
    files.push(file);
  });
  finder.on('end', function(){
    logger.debug('selected files : ');
    files.filter(require('minimatch').filter(f, {matchBase: true}))
      .forEach(function (f){
        logger.debug(f);
        cb.apply(ctxt,[f]);
      });
  });
}

/**
 * start watching files
 */
function start (){
  // remote config is ready lets play !
  var remote = require('./' + configVersion);
  Object.keys(remote).forEach(function (file) {
    var e = extractor({lines:[], errors:[], timer: null});
    extractors.push(e);
    logger.info(file + ' :');
    Object.keys(remote[file]).forEach(function (regexp){
      logger.info(' ✓ pattern : ' + regexp);
      e.matches(new RegExp(regexp), function(m,vars){
        //logger.info('match : %s', util.inspect(m));
        remote[file][regexp](m,vars);
        send(vars);
      });
    });
    wildcards(file, e, e.watch);
  });
}

/**
 * stop watching files
 */
function stop (){
  extractors.forEach(function(e){
    e.close();
  });
  logger.info('stop watching');
  var filename = path.join(__dirname, configVersion + '.js');
  fs.unlink(filename, function (err) {
    if (err){
      logger.info('unable to delete ' + filename);
    }
  });
  delete require.cache[filename];
}

if(config.offline) { // offline
  logger.info('offline mode...');
  configVersion = 'remote-config';
  process.nextTick(start);
}else{ // online : retrieve match config
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

