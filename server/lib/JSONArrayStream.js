var es = require('event-stream');

/** join documents to an Array in response stream.*/
var arrayStream = function () {
  var first = true;
  return es.through(function write(data) {
    if (first) {
      this.emit('data', '[');
      first = false;
    }
    else {
      this.emit('data', ',');
    }
    this.emit('data', JSON.stringify(data));
    return true;
  }, function end() {
    if (!first) {
      this.emit('data', ']');
    }
    else { // emit valid array
      this.emit('data', '[]');
    }
    this.emit('end');
    return true;
  });
};

module.exports = function () {
  return {
    stream: arrayStream,
    writeHeaders: function (req, res) {
      res.setHeader('Content-Type', 'application/json');
    }
  };
};

