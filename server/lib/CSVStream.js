var es = require('event-stream');

/** join documents to an CSV stream in response.*/
var csvStream = function (toCSV, head) {
  var first = true,
    header = head;
  return es.through(function write(data) {
    if (first) {
      if (header) {
        this.emit('data', header + '\n');
      }
      first = false;
    }
    this.emit('data', toCSV(data) + '\n');
    return true;
  }, function end() {
    if (first) {
      if (header) {
        this.emit('data', header + '\n');
      }
    }
    this.emit('end');
    return true;
  });
};

var allKeys = function(item){
  return Object.keys(item).map(function(key){
    return item[key];
  }).join(';');
}

module.exports = function (tocsv, headers) {
  return {
    stream: function(){
      return csvStream(tocsv || allKeys, headers);
    },
    writeHeaders: function (req, res) {
      res.setHeader('Content-Type', 'text/csv');
    }
  };
};

