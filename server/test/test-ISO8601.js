var iso8601 = require('../lib/ISO8601'),
  vows = require('vows'),
  assert = require('assert');


vows.describe('an is8601 lib').addBatch({
  'can handle dates': {
    topic: iso8601.date,
    'date is defined ': function (topic) {
      assert.ok(topic);
    },
    'has a \'now\' method ': {
      topic: function (topic) {
        return topic.now();
      },
      'which returns current date as ISO8601 format': function (topic) {
        assert.equal(new Date().toISOString().split('T')[0], topic);
      }
    },
    'has an \'start\' method with no args': {
      topic: function (topic) {
        return topic.start();
      },
      'which which sets date to today at midnight ': function (topic) {
        assert.equal(topic.split('T')[0], iso8601.date.now());
      },
      'which which sets date time at midnight ': function (topic) {
        assert.equal(topic.split('T')[1], '00:00:00.000Z');
      },
      'which returns a valid iso date string': function (topic) {
        assert.ok(Date.parse(topic));
      }
    },
    'has an \'start\' method with `2003-12-01` date string ': {
      topic: function (topic) {
        return topic.start('2003-12-01');
      },
      'which which sets date to `2003-12-01` at midnight ': function (topic) {
        assert.equal(topic.split('T')[0], '2003-12-01');
      },
      'which which sets date time at midnight ': function (topic) {
        assert.equal(topic.split('T')[1], '00:00:00.000Z');
      },
      'which returns a valid iso date string': function (topic) {
        assert.ok(Date.parse(topic));
      }
    },
    'has an \'end\' method': {
      topic: function (topic) {
        return topic.end();
      },
      'which which sets date to today at a milisecond before midnight ': function (topic) {
        assert.equal(topic.split('T')[0], iso8601.date.now());
      },
      'which which sets date time at last milisecond of the day ': function (topic) {
        assert.equal(topic.split('T')[1], '23:59:59.999Z');
      },
      'which returns a valid iso date string': function (topic) {
        assert.ok(Date.parse(topic));
      }
    },
    'has an \'end\' method with `2003-12-01` date string ': {
      topic: function (topic) {
        return topic.end('2003-12-01');
      },
      'which which sets date to `2003-12-01` at a milisecond before midnight ': function (topic) {
        assert.equal(topic.split('T')[0], '2003-12-01');
      },
      'which which sets date time at last milisecond of the day ': function (topic) {
        assert.equal(topic.split('T')[1], '23:59:59.999Z');
      },
      'which returns a valid iso date string': function (topic) {
        assert.ok(Date.parse(topic));
      }
    }
  }
}).export(module);