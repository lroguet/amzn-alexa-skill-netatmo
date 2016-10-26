'use strict';

// Constructor
module.exports = class Netatmo {

  constructor() {

    try {
      this._resources = require('./conf/netatmo.json');
    } catch (error) {
      console.error('Could not load ./conf/netatmo.json', error);
    }

  }

  // Returns an array of data types supported by a module of that module types
  // Example. [ "humidity", "temperature" ] for 'namodule1' (outdoor module)
  getDataTypes(moduleType) {
    return this._resources.modules[moduleType];
  }

}