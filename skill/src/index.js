'use strict';

var DEBUG_MODE = true;

// --- Configuration -----------------------------------------------------------
var CREDENTIALS = require('./conf/credentials.json');
var SKILL = require('./conf/skill.json');
// -----------------------------------------------------------------------------

// --- Libraries ---------------------------------------------------------------
var ALEXA = require('alexa-sdk');
var HTTPS = require('https');
var JMESPATH = require('jmespath');
var QUERYSTRING = require('querystring');
var UTIL = require('util');
// -----------------------------------------------------------------------------
var Resources = require('./resources.js');
var Units = require('./units.js');
// -----------------------------------------------------------------------------
var ERRORS = {
  ACCESS_TOKEN_NA: '_ACCESS_TOKEN_NA',
  NETATMO_API_ERROR: '_NETATMO_API_ERROR'
};

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

// Holds the response (or an error type from ERRORS) from the call to the
// Netatmo API
var data;

// Holds locale specific resources (speeches)
var resources;

exports.handler = function (event, context, callback) {

  // Initialize
  resources = new Resources(event.request.locale);
  // Fetch weather data right now since it's pretty much required for
  // all intents, then move on to 'Atmo'
  getAllWeatherStationData(event, context, atmo);

};

// Main function
function atmo(event, context) {

  var alexa = ALEXA.handler(event, context);
  alexa.appId = CREDENTIALS.amazonApplicationId;
  alexa.registerHandlers(handlers);
  alexa.execute();

}

// Intent handlers
var handlers = {
  'GetMeasurement': function () {
    if (canProvideWithResponse(this)) {
      var message = getTheWeatherStationData(
        getSpokenOrDefaultMeasurementName(this.event.request.intent),
        getSpokenOrDefaultSensorName(this.event.request.intent)
      );
      log(message);
      this.emit(':tell', message);
    }
  },
  'LaunchRequest': function () {
    // Launching the skill is equivalent to asking for help
    this.emit('AMAZON.HelpIntent');
  },
  'ListMeasurements': function () {
    if (canProvideWithResponse(this)) {
      var message = getTheSensorAvailableMeasurements(
        getSpokenOrDefaultSensorName(this.event.request.intent)
      );
      log(message);
      this.emit(':tell', message);
    }
  },
  'ListSensors': function () {
    if (canProvideWithResponse(this)) {
      var message = getTheWeatherStationSensors();
      log(message);
      this.emit(':tell', message);
    }
  },
  'AMAZON.HelpIntent': function () {
    if (canProvideWithResponse(this)) {
      var message = UTIL.format(resources.getSpeechForOutput("help"), SKILL.title, getSpokenOrDefaultSensorName(null));
      log(message);
      this.emit(':ask', message, message);
    }
  },
  'AMAZON.YesIntent': function () {
    this.emit('GetMeasurement');
  },
  'AMAZON.NoIntent': function () {
    this.emit(':tell', resources.getSpeechForOutput("noIntent"));
  },
  'AMAZON.CancelIntent': function () {
    this.emit('AMAZON.NoIntent');
  },
  'AMAZON.StopIntent': function () {
    this.emit('AMAZON.NoIntent');
  },
  'Unhandled': function () {
    this.emit('AMAZON.HelpIntent');
  }
};

// --- Error handler -----------------------------------------------------------
// Returns true if the user request can be fulfilled, emits the appropriate
// reponse and returns false otherwise.
function canProvideWithResponse(context) {

  var message;
  // Access token to the Netatmo API was not provided, emits a link account card
  if (!accessTokenWasProvided()) {
    message = UTIL.format(resources.getSpeechForOutput("accountLinking"), SKILL.title);
    log(message);
    context.emit(':tellWithLinkAccountCard', message);
    return false;
  }

  // An error occured while contacting the Netatmo API, emits an error message
  if (!communicationWasSuccessful()) {
    message = resources.getSpeechForOutput("apiError");
    log(message);
    context.emit(':tell', message);
    return false;
  }

  // No weather data could be found in the linked Netatmo account
  if (!hasWeatherData()) {
    message = resources.getSpeechForOutput("weatherStationNotFound");
    log(message);
    context.emit(':tell', message);
    return false;
  }

  // Things are looking good
  return true;

}

// --- Helpers for intents -----------------------------------------------------

function getTheSensorAvailableMeasurements(sensor) {

  var _sensor = getSanitized(sensor);
  log("Available measurements on " + _sensor + " (" + sensor + ").");

  // Exit if the sensor does not exist
  if (!sensorExists(data, _sensor)) {
    return UTIL.format(resources.getSpeechForOutput("sensorNotFound"), sensor);
  }

  var pattern = "[ body.devices[?module_name == `" + _sensor + "`].type, body.devices[].modules[?module_name == `" + _sensor + "`].type | [] ] | [] | join(', ', @)";
  var result = JMESPATH.search(data, pattern);

  var Netatmo = require('./netatmo.js');
  var dataTypes = new Netatmo().getDataTypes(result);

  return UTIL.format(
    resources.getSpeechForOutput("measurements"),
    sensor,
    resources.getSpeechesForDataTypes(dataTypes).join(", ")
  );

}

function getTheWeatherStationSensors() {

  // Find the name of the base station & all the additional modules
  var pattern = "[ body.devices[].modules[].module_name, body.devices[].module_name ] | []";
  var result = JMESPATH.search(data, pattern);
  return UTIL.format(resources.getSpeechForOutput("sensors"), result.join(", "));

}

function getTheWeatherStationData(measurement, sensor) {

  var units = new Units(data);

  var dataType = resources.getDataTypeForSpeech(getSanitized(measurement));
  var _sensor = getSanitized(sensor);

  // console.log(JSON.stringify(data));
  log(dataType + " (" + measurement + ") on " + _sensor + " (" + sensor + ").");

  // Exit if the sensor does not exist
  if (!sensorExists(data, _sensor)) {
    // TODO. Rain or wind related readings will result in an 'empty' sensor name, deal with it.
    return UTIL.format(resources.getSpeechForOutput("sensorNotFound"), sensor);
  }

  // Exit if the sensor cannot provide with the measurement
  if (!dataTypeProvidedBySensor(data, dataType, _sensor)) {
    return UTIL.format(resources.getSpeechForOutput("measurementNotFound"), measurement, sensor);
  }

  // Get the value...
  var pattern = "[ body.devices[?module_name==`" + _sensor + "`].dashboard_data." + dataType + ", body.devices[].modules[?module_name==`" + _sensor + "`].dashboard_data." + dataType + " | [] ] | []";
  var value = JMESPATH.search(data, pattern);

  // All good, we've got something to say back to the user
  return UTIL.format(
    resources.getSpeechForOutput("measurement"),
    resources.getSpeechForDataType(dataType),
    units.getValue(dataType, value),
    units.getUnit(dataType),
    sensor
  );

}

// TODO - The rain and wind related measurements could default to their respective modules
function getSpokenOrDefaultSensorName(intent) {

  if (intent && intent.slots && intent.slots.SensorName && intent.slots.SensorName.value) {
    return intent.slots.SensorName.value;
  } else {

    var dataType = resources.getDataTypeForSpeech(getSanitized(getSpokenOrDefaultMeasurementName(intent)));

    var pattern;
    switch (dataType) {
      // #2 - Only one wind gauge can be added to a weather station
      case 'guststrength':
        pattern = "body.devices[].modules[?data_type[0] == 'wind'].module_name | [] | join(', ', @)";
        break;
      // #6 - Only one rain gauge can be added to a weather station
      case 'rain':
        pattern = "body.devices[].modules[?data_type[0] == 'rain'].module_name | [] | join(', ', @)";
        break;
      // #2 - Only one wind gauge can be added to a weather station
      case 'windstrength':
        pattern = "body.devices[].modules[?data_type[0] == 'wind'].module_name | [] | join(', ', @)";
        break;
      // Otherwise we'll fetch from the main module
      default:
        pattern = "body.devices[0].module_name";
    }

    return JMESPATH.search(data, pattern);

  }

}

function getSpokenOrDefaultMeasurementName(intent) {

  if (intent && intent.slots && intent.slots.MeasurementName && intent.slots.MeasurementName.value) {
    return intent.slots.MeasurementName.value
  } else {
    return 'temperature';
  }

}

// --- Helpers that check the existence of things ------------------------------

function sensorExists(data, sensor) {

  var pattern = "[ body.devices[?module_name==`" + sensor + "`], body.devices[].modules[?module_name==`" + sensor + "`] | [] ] | []";
  var result = JMESPATH.search(data, pattern);
  return result.length > 0;

}

function dataTypeProvidedBySensor(data, dataType, sensor) {

  var pattern = "[ body.devices[?module_name==`" + sensor + "`].dashboard_data." + dataType + ", body.devices[].modules[?module_name==`" + sensor + "`].dashboard_data." + dataType + " | [] ] | []";
  var result = JMESPATH.search(data, pattern);
  return result.length > 0;

}

// --- Other helpers -----------------------------------------------------------

function getSanitized(text) {

  text = text.replace(/[']/g, ""); // Kid's bedroom => Kids bedroom
  text = text.toLocaleLowerCase();
  return text;

}

// Checks whether the data contains the bare minimum needed to answer the most
// basic intents
function hasWeatherData() {

  return data.body
    && data.body.user && data.body.user.administrative
    && data.body.devices && (data.body.devices.length > 0);

}

// Returns true if the API call to Netatmo was a success
function communicationWasSuccessful() {
  return data != ERRORS.NETATMO_API_ERROR;
}

// Returns true if the access token to the Netatmo API was provided
function accessTokenWasProvided() {
  return data != ERRORS.ACCESS_TOKEN_NA;
}

function log(message) {

  if (DEBUG_MODE) {
    console.log(message);
  }

}

// Retrieves weather data from the Netatmo API
function getAllWeatherStationData(event, context, callback) {

  // Access token is required
  if (!(event && event.session && event.session.user && event.session.user.accessToken)) {
    data = ERRORS.ACCESS_TOKEN_NA;
    callback(event, context);
  }

  var requestData = QUERYSTRING.stringify(
    { 'access_token': event.session.user.accessToken }
  );
  var requestOptions = {
    host: 'api.netatmo.com',
    path: '/api/getstationsdata',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };

  var request = HTTPS.request(
    requestOptions,
    function (response) {
      response.setEncoding('utf8');
      // On error
      response.on('error', function (error) {
        data = ERRORS.NETATMO_API_ERROR;
        callback(event, context);
      });
      // Incoming response
      var incoming = '';
      response.on('data', function (chunk) {
        incoming += chunk;
      });
      // Response received
      response.on('end', function () {
        data = JSON.parse(getSanitized(incoming));
        callback(event, context)
      });
    });

  request.on('error', function (error) {
    data = ERRORS.NETATMO_API_ERROR;
    callback(event, context);
  });

  request.write(requestData);
  request.end();

}
