var jsonStream = require('../lib/JSONArrayStream'),
  vows = require ('vows'),
  events = require ('events'),
  assert = require('assert');


vows.describe('a JSON Array Stream').addBatch({
  'When can create a JSONArrayStream': {
    topic: jsonStream(),
    'I get a reference to an object': function(topic){
      assert.ok(topic);
    },
    'with a \'stream\' method': function(topic){
      assert.ok(topic.stream);
      assert.equal('function', typeof topic.stream);
    },
    'with a \'writeHeaders\' method': function(topic){
      assert.ok(topic.writeHeaders);
      assert.equal('function', typeof topic.writeHeaders);
    },
    'I can create a stream ':{
      topic: function(parent){
        return parent.stream();
      },
      'I get a stream object': function (topic){
        assert.equal('object', typeof topic);
      },
      'I can write data into that stream ':{
        topic: function(stream){
          var context = this;
          var res = '';
          stream.on('data', function(data){
            res += data;
          });
          stream.on('end', function(){
            var arr = JSON.parse(res);
            context.callback(null,arr);
          });

          stream.write({'hello':'world'});
          stream.end();
          //return promise;
        },
        'and I get data writen as JSArray':function(err,arr){
          assert.equal(1, arr.length);
          assert.equal('world', arr[0].hello);
        }
      }
    }
  }
}).export(module);

