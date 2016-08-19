'use strict';

// --- Configuration -----------------------------------------------------------
var CREDENTIALS = require('./conf/credentials.json');
var MESSAGES = require('./conf/messages.json');
var SKILL = require('./conf/skill.json');
var NETATMO = require('./conf/netatmo.json');
// -----------------------------------------------------------------------------

// --- Libraries ---------------------------------------------------------------
var ALEXA = require('alexa-sdk');
var HTTPS = require('https');
var JMESPATH = require('jmespath');
var QUERYSTRING = require('querystring');
var UTIL = require('util');
// -----------------------------------------------------------------------------

var NAMES = NETATMO.dataTypeToSpeech;
var SLOTS = NETATMO.slotToDataType;
var UNITS = NETATMO.dataTypeToUnit;

var DEFAULTdataType = 'temperature';
var UNDEFINED = 'undefined';

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

var data;

exports.handler = function(event, context, callback) {

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
  'GetMeasurement': function() {
    this.emit(':tell',
      getTheWeatherStationData(
        getSpokenOrDefaultMeasurementName(this.event.request.intent),
        getSpokenOrDefaultSensorName(this.event.request.intent)
      )
    );
  },
  'LaunchRequest': function() {
    // Launching the skill will read the temperature from the base station
    this.emit('GetMeasurement');
  },
  'ListSensors': function() {
    this.emit(':tell', getTheWeatherStationSensors());
  },
  'Unhandled': function() {
    this.emit(':ask', MESSAGES.help, MESSAGES.help);
  }
};

// --- Helpers for intents -----------------------------------------------------

function getTheWeatherStationSensors() {

  if(!hasWeatherData()) {
    return MESSAGES.weatherStationNotFound;
  }

  var pattern = "[ body.devices[].modules[].module_name, body.devices[].module_name ] | []";
  var result = JMESPATH.search(data, pattern);

  return UTIL.format(MESSAGES.sensors, result.join(", "));

}

function getTheWeatherStationData(measurement, sensor) {

  // console.log("Data", JSON.stringify(data));

  if(!hasWeatherData()) {
    return UTIL.format(MESSAGES.weatherStationNotFound, SKILL.title);
  }

  var _data = JSON.parse(getSanitized(JSON.stringify(data)));
  var dataType = NETATMO.slotToDataType[getSanitized(measurement)];
  var _sensor = getSanitized(sensor);

  // console.log("Got '" + measurement + "' on '" + sensor + "'.");
  // console.log("Looking for '" + dataType + "' on '" + _sensor + "'.");

  // Exit if the sensor does not exist
  if(!sensorExists(_data, _sensor)) {
    return UTIL.format(MESSAGES.sensorNotFound, sensor);
  }

  // Exit if the sensor cannot provide with the measurement
  if(!dataTypeProvidedBySensor(_data, dataType, _sensor)) {
    return UTIL.format(MESSAGES.measurementNotFound, measurement, sensor);
  }

  // Get the value...
  var pattern = "[ body.devices[?module_name==`" + _sensor + "`].dashboard_data." + dataType + ", body.devices[].modules[?module_name==`" + _sensor + "`].dashboard_data." + dataType + " | [] ] | []";
  var value = JMESPATH.search(_data, pattern);
  // ... and the unit
  var unit = getUserUnits()[dataType];

  // All good, we've got something to tell the user
  return UTIL.format(MESSAGES.measurement, NAMES[dataType], value, unit, sensor);

}

function getSpokenOrDefaultSensorName(intent) {
    if(intent && intent.slots && intent.slots.SensorName && intent.slots.SensorName.value) {
      return intent.slots.SensorName.value;
    } else {
      return JMESPATH.search(data, "body.devices[0].module_name");
    }
}

function getSpokenOrDefaultMeasurementName(intent) {
  if(intent && intent.slots && intent.slots.MeasurementName && intent.slots.MeasurementName.value) {
    return intent.slots.MeasurementName.value
  } else {
    return 'temperature';
  }
}

function getUserUnits() {

    // Intent custom slot to unit
    return {
        "co2": UNITS.co2,
        "humidity": UNITS.humidity,
        "noise": UNITS.noise,
        "pressure": UNITS.pressure[JMESPATH.search(data, "body.user.administrative.pressureunit")],
        "temperature": "degrees " + UNITS.temperature[JMESPATH.search(data, "body.user.administrative.unit")]
    };

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

  return text.replace(/[']/g, "").toLocaleLowerCase();

}

// Check whether the data contains the bare minimum needed to answer the most
// basic intent
function hasWeatherData() {

  return data.body
    && data.body.user && data.body.user.administrative
    && data.body.devices && data.body.devices._id;

}

// Retrieves weather data from the Netatmo API
function getAllWeatherStationData(event, context, callback) {

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
    function(response) {
      response.setEncoding('utf8');
      // On error
      response.on('error', function(error) {
        console.error("Request to api.netatmo.com failed.", error);
        context.fail(MESSAGES.apiError);
      });
      // Incoming response
      var incoming = '';
      response.on('data', function(chunk) {
        incoming += chunk;
      });
      // Response received
      response.on('end', function() {
        data = JSON.parse(incoming);
        callback(event, context)
      });
    });
    request.write(requestData);
    request.end();

}
