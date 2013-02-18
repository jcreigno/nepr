module.exports = (function () {
  /**
   * day start time. 
   */
  var START_TIME = '00:00:00.000Z';
  /**
   * day end time.
   */
  var END_TIME = '23:59:59.999Z';

  /**
   * return today's date part as ISO8601 date string.
   */
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * returns a function that appends 'time' part of iso date.
   * If date is unspecified were using current iso date part as in `today`. 
   */
  function append(time) {
    return function (date) {
      return (date || today()) + 'T' + time;
    };
  }

  return {
    date: {
      now: today,
      start: append(START_TIME),
      end: append(END_TIME)
    }
  };
})();