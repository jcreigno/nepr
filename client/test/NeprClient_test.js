var vows = require('vows'),
  fs = require('fs'),
  path = require('path'),
  assert = require('assert'),
  http = require('http'),
  os = require('os');

var NeprClient = require('../lib/NeprClient.js');


function asserts(req, data) {
  assert.equal('/data/' + config.env + '/' + config.type + '/' + os.hostname(), req.url);
  assert.ok(data);
  if (count === 1) {
    assert.equal(1, data.length);
    var first = data[0];
    assert.ok(first);
    assert.equal('perf', first.type);
    console.log(data);
  }
  else {
    assert.equal(113, data.length);
  }
}

var callbacks = [];

var server = http.createServer();
server.on('request', function (req, res) {
  req.setEncoding('utf-8');
  var data = '';
  req.on('data', function (chunk) {
    data += chunk;
  }).on('end', function () {
    var cb = callbacks.pop();
    console.dir(cb);
    cb(req, JSON.parse(data));
    res.writeHead(200);
    res.end();
  });
});
server.listen(process.env.PORT || 3000);

// remote test configuration
var remote = {
  './logs/service.log': {
    '^ INFO\\|([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*) TIME-USED;(\\d*);0;0;': function (m, vars) {
      vars.lines.push({
        type: 'perf',
        date: m[1],
        userid: m[2],
        sessionid: m[3],
        requestid: m[4],
        service: m[5],
        operation: m[6],
        elapsed: parseInt(m[7], 10)
      });
    },
    '^ERROR\\|([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)': function (m, vars) {
      vars.lines.push({
        type: 'error',
        date: m[1],
        userid: m[2],
        sessionid: m[3],
        requestid: m[4],
        clazz: m[5],
        message: m[6]
      });
    }
  }
};


//local test configuration
var config = require(path.join(__dirname, 'config.json'));
var client = new NeprClient(config);

vows.describe('nepr client').addBatch({
  'when starting ': {
    topic : function(){
      callbacks.push(this.callback);
      client.start(remote);
    },
    'we get notified ' : function (topic){
      console.log(topic);
    }
  },
  teardown: function() {
      server.close(function() {
        console.log('server down.');
        fs.unlinkSync(path.join(__dirname, 'logs/service.log'));
      });
  }
}).export(module);

var ws = fs.createWriteStream(path.join(__dirname, 'logs/service.log'), {
  flags: 'w'
}).on('close', function(){client.stop();});
//write to target file to trigger events.
fs.createReadStream(path.join(__dirname, './logs/service.orig'), {
  flags: 'r'
}).pipe(ws);
