var vows = require('vows'),
  fs = require('fs'),
  path = require('path'),
  assert = require('assert'),
  http = require('http'),
  os = require('os');

var NeprClient = require('../lib/NeprClient.js');

//remote configuration 
var remote = {
  './logs/service.log': {
    '^ INFO\\|([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*) TIME-USED': function(vars){
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
   }
  }
};

//local test configuration
var config = require(path.join(__dirname, 'config.json'));

vows.describe('nepr client').addBatch({
  'when creating client ': {
    topic : new NeprClient(config),
    'we get a client with no extractors ' : function (topic){
      assert.ok(topic.extractors.length===0);
    },
    'we can start client ' : {
      topic: function(topic) {
        return topic.start(remote);
      },
      'we now have an extractor ': function (topic){
          assert.ok(topic.extractors.length===1);
      }
    }
  }
}).export(module);
