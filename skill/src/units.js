'use strict';

var JMESPATH = require('jmespath');
var undefined = 'undefined_unit';

// Constructor
module.exports = class Units {

  constructor(data) {

    var allUnits = require('./conf/units.json');
    this._userUnits = {
      "co2": allUnits.co2,
      "guststrength": allUnits.wind[JMESPATH.search(data, "body.user.administrative.windunit")],
      "humidity": allUnits.humidity,
      "noise": allUnits.noise,
      "pressure": allUnits.pressure[JMESPATH.search(data, "body.user.administrative.pressureunit")],
      "rain": allUnits.rain[JMESPATH.search(data, "body.user.administrative.unit")],
      "temperature": "degrees " + allUnits.temperature[JMESPATH.search(data, "body.user.administrative.unit")],
      "windstrength": allUnits.wind[JMESPATH.search(data, "body.user.administrative.windunit")]
    };

  }

  // Returns the user unit for the given data type
  // Example. 'ppm' for 'co2'
  getUnit(dataType) {
    return this._userUnits[dataType] ? this._userUnits[dataType] : undefined;
  }

}