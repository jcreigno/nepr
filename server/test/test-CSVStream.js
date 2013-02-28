var csvStream = require('../lib/CSVStream'),
  vows = require ('vows'),
  events = require ('events'),
  assert = require('assert');

var tocsv = function (item) {
  return [item.foo, item.bar, item.baz, item.qix].join(';');
};

vows.describe('a CSV Stream').addBatch({
  'When I require a csvStream,': {
    topic: csvStream,
    'I get a reference to an object': function(topic){
      assert.ok(topic);
    },
    'I can create a stringify stream with default a custom csv mapper ':{
      topic: function(parent){
        return parent.stringify(tocsv);
      },
      'I get a stream object': function (topic){
        assert.equal('object', typeof topic);
      },
      'and write data into that stream ':{
        topic: function(stream){
          var context = this;
          var res = '';
          stream.on('data', function(data){
            res += data;
          });
          stream.on('end', function(){
            context.callback(null,res);
          });

          stream.write({foo:1,bar:2,baz:3,qix:4});
          stream.write({foo:-1,bar:-2,baz:-3,qix:-4});
          stream.end();
          //return promise;
        },
        'and I get data writen as CSV':function(err, csv){
          var elems = csv.split('\n');
          assert.equal(3, elems.length);
          assert.equal('1;2;3;4', elems[0]);
          assert.equal('-1;-2;-3;-4', elems[1]);
        }
      }
    }
  }
}).addBatch({
  'When I require a csvStream,': {
    topic: csvStream,
    'I get a reference to an object': function(topic){
      assert.ok(topic);
    },
    'I can create a stringify stream with default CSV mapper':{
      topic: function(parent){
        return parent.stringify();
      },
      'and get a stream object': function (topic){
        assert.equal('object', typeof topic);
      },
      'and can write data into that stream ':{
        topic: function(stream){
          var context = this;
          var res = '';
          stream.on('data', function(data){
            res += data;
          });
          stream.on('end', function(){
            context.callback(null,res);
          });
          stream.on('error', function(err){
            context.callback(err,null);
          });

          stream.write({foo:1,bar:2,baz:3,qix:4});
          stream.write({foo:-1,bar:-2,baz:-3,qix:-4});
          stream.end();
          //return promise;
        },
        'and I get data writen as CSV': function(err, csv){
          if(err){
            assert.fail(err);
          } else{
            var elems = csv.split('\n');
            assert.equal(3, elems.length);
            assert.equal('1;2;3;4', elems[0]);
            assert.equal('-1;-2;-3;-4', elems[1]);
          }
        }
      }
    }
  }

}).export(module);

