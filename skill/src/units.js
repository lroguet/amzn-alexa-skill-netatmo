'use strict';

var BEAUFORT = require('beaufort');
var JMESPATH = require('jmespath');
var undefined = 'undefined_unit';

// Constructor
module.exports = class Units {

  constructor(data) {


    this._unit = JMESPATH.search(data, "body.user.administrative.unit");
    this._pressureUnit = JMESPATH.search(data, "body.user.administrative.pressureunit");
    this._windUnit = JMESPATH.search(data, "body.user.administrative.windunit");

    var allUnits = require('./conf/units.json');
    this._userUnits = {
      "co2": allUnits.co2,
      "guststrength": allUnits.wind[this._windUnit],
      "humidity": allUnits.humidity,
      "noise": allUnits.noise,
      "pressure": allUnits.pressure[this._pressureUnit],
      "rain": allUnits.rain[this._unit],
      "temperature": allUnits.temperature[this._unit],
      "windstrength": allUnits.wind[this._windUnit]
    };

  }

  // Returns the user unit for the given data type
  // Example. 'ppm' for 'co2'
  getUnit(dataType) {
    return this._userUnits[dataType] ? this._userUnits[dataType] : undefined;
  }

  // Returns the value in user units for the given data type
  // Example. a temperature of 20 degress Celsius will be converted to 68 degrees Fahrenheit
  getValue(dataType, value) {

    // Temperature
    if (dataType === 'temperature' && this._unit == 1) {
      return Math.round((value * 1.8) + 32); // Celsius to Fahrenheit
    } 
    // Rain
    else if (dataType === 'rain' && this._unit == 1) {
      return value * 0.0393701; // mm/h to in/h
    }
    // Wind
    else if ((dataType === 'guststrength' || dataType === 'windstrength') && this._windUnit > 0) {
      switch (this._windUnit) {
        case 1:
          return value * 0.621371; // km/h to mi/h
        case 2:
          return value * 0.277778; // km/h to m/s
        case 3:
          return BEAUFORT(value, { unit: 'kmh', getName: false }); // km/h to beaufort
        case 4:
          return value * 0.539957; // km/h to knot
      }
    }
    // Pressure
    else if (dataType === 'pressure' && this._pressureUnit > 0) {
      switch (this._pressureUnit) {
        case 1:
          return value * 0.02953; // mbar to inHg
        case 2:
          return value * 0.750062; // mbar to mmHg
      }
    }
    // // Otherwise: co2, humidity, noise and units that don't need to be converted
    else {
      return value;
    }

  }

}