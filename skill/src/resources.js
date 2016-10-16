'use strict';

var UNDERSCORE = require('underscore');

var undefinedCustomSlot = 'undefined_custom_slot';
var undefinedDataType = 'undefined_data_type';
var undefinedSpeech = 'undefined_speech';

// Constructor
module.exports = class Resources {

  constructor(locale) {

    try {
      this._resources = require('./resources/' + locale + '.json');
    } catch (error) {
      this._resources = require('./resources/en-US.json');
    }

    this._outputs = this._resources.outputs;
    this._dataTypes = this._resources.dataTypes;
    this._customSlots = UNDERSCORE.invert(this._dataTypes);

  }

  // Returns the speech for a given output
  // Example. 'Okay. Talk to you later.' for 'noIntent'
  getSpeechForOutput(output) {
    return this._outputs[output] ? this._outputs[output] : undefinedSpeech;
  }

  // Returns the speech for a given data type
  // Example. 'carbon dioxide level' for 'co2'
  getSpeechForDataType(dataType) {
    return this._dataTypes[dataType] ? this._dataTypes[dataType] : undefinedDataType;
  }

  // Returns the data type for a given speech
  // Example. 'co2' for 'carbon dioxide level'
  getDataTypeForSpeech(speech) {
    return this._customSlots[speech] ? this._customSlots[speech] : undefinedCustomSlot;
  }

}