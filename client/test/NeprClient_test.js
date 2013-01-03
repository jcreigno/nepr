var fs = require('fs'), path = require('path'), assert = require('assert'), http = require('http'), os = require('os');

var NeprClient = require('../lib/NeprClient.js');

var config = require(path.join(__dirname, 'config.json'));

var client = new NeprClient(config);

var count = 0, EXPECTED = 2;

function asserts(req, count, data){
  assert.equal('/data/' + config.env + '/' + config.type + '/' + os.hostname(), req.url);    
  assert.ok(data);
  if(count === 1){
    assert.equal(1, data.length);
    var first = data[0];
    assert.ok(first);
    assert.equal('perf', first.type);
    console.log(data);
  } else {
    assert.equal(113, data.length);
  }
}


var server = http.createServer()
server.on('request',function(req,res){
  req.setEncoding('utf-8');
//  cons.push(req.connection);
  var data = '';
  req.on('data',function(chunk){
    data += chunk;
  }).on('end',function(){
    var parsed = JSON.parse(data);
    asserts(req, ++count, parsed);
    res.writeHead(200);
    res.end();
    if(count >= EXPECTED){
      client.stop();
      server.close(function(){
        console.log('server down.');
        fs.unlinkSync('./logs/service.log');
      });
    }
  });
});

server.listen(3000);

client.start({
		'./logs/service.log':{
      '^ INFO\\|([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*) TIME-USED;(\\d*);0;0;': function(m,vars){
        vars.lines.push({
                  type:'perf',
                  date:m[1],
                  userid:m[2],
                  sessionid:m[3],
                  requestid:m[4],
                  service:m[5],
                  operation:m[6],
                  elapsed:parseInt(m[7],10)
              });
      },
      '^ERROR\\|([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)' : function(m,vars){
        vars.lines.push({
                  type:'error',
                  date:m[1],
                  userid:m[2],
                  sessionid:m[3],
                  requestid:m[4],
                  clazz:m[5],
                  message:m[6]
              });
      }
}});

var ws = fs.createWriteStream('./logs/service.log', {flags: 'w'});
//write to target file to trigger events.
fs.createReadStream('./logs/service.orig', {flags: 'r'}).pipe(ws);

