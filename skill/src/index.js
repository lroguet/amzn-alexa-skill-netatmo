'use strict';

// --- Configuration -----------------------------------------------------------
var MESSAGES, NETATMO, SKILL;
var CREDENTIALS = require('./conf/credentials.json');
var SETTINGS = require('./conf/settings.json');
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

var ERRORS = {
  ACCESS_TOKEN_NA: '_ACCESS_TOKEN_NA',
  NETATMO_API_ERROR: '_NETATMO_API_ERROR'
};
var UNDEFINED = 'undefined';

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------

// Holds the response (or an error type from ERRORS) from the call to the
// Netatmo API
var data;

exports.handler = function(event, context, callback) {

  // Localize resources
  localize(event);
  // Fetch weather data right now since it's pretty much required for
  // all intents, then move on to 'Atmo'
  getAllWeatherStationData(event, context, atmo);

};

// Localize resources
function localize(event) {

  // Selecting human facing resources based on the skill locale
  // Defaulting to en-US
  var locale = "en-US";
  if(SETTINGS.locales.indexOf(event.request.locale) > -1) {
    locale = event.request.locale;
  }
  console.log("User locale: " + event.request.locale + ", skill locale: " + locale);

  var localized = './conf/' + locale;
  MESSAGES = require(localized '/messages.json');
  NETATMO = require(localized + '/netatmo.json');
  SKILL = require(localized + '/skill.json');

}

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
    if(canProvideWithResponse(this)) {
      this.emit(':tell',
        getTheWeatherStationData(
          getSpokenOrDefaultMeasurementName(this.event.request.intent),
          getSpokenOrDefaultSensorName(this.event.request.intent)
        )
      );
    }
  },
  'LaunchRequest': function() {
    // Launching the skill is equivalent to asking for help
    this.emit('AMAZON.HelpIntent');
  },
  'ListMeasurements': function() {
    if(canProvideWithResponse(this)) {
      this.emit(':tell',
        getTheSensorAvailableMeasurements(
          getSpokenOrDefaultSensorName(this.event.request.intent)
        )
      );
    }
  },
  'ListSensors': function() {
    if(canProvideWithResponse(this)) {
      this.emit(':tell', getTheWeatherStationSensors());
    }
  },
  'AMAZON.HelpIntent': function() {
    if(canProvideWithResponse(this)) {
        var message = UTIL.format(MESSAGES.voice.help, SKILL.title, getSpokenOrDefaultSensorName(null));
        this.emit(':ask', message, message);
    }
  },
  'AMAZON.YesIntent': function() {
    this.emit('GetMeasurement');
  },
  'AMAZON.NoIntent': function() {
    this.emit(':tell', "Okay. Talk to you later.");
  },
  'AMAZON.CancelIntent': function() {
    this.emit('AMAZON.NoIntent');
  },
  'AMAZON.StopIntent': function() {
    this.emit('AMAZON.NoIntent');
  },
  'Unhandled': function() {
    this.emit('AMAZON.HelpIntent');
  }
};


// --- Error handler -----------------------------------------------------------
// Returns true if the user request can be fulfilled, emits the appropriate
// reponse and returns false otherwise.
function canProvideWithResponse(context) {

  // Access token to the Netatmo API was not provided, emits a link account card
  if(!accessTokenWasProvided()) {
    context.emit(':tellWithLinkAccountCard', UTIL.format(MESSAGES.voice.accountLinking, SKILL.title));
    return false;
  }

  // An error occured while contacting the Netatmo API, emits an error message
  if (!communicationWasSuccessful()) {
    context.emit(':tell', MESSAGES.voice.apiError);
    return false;
  }

  // No weather data could be found in the linked Netatmo account
  if(!hasWeatherData()) {
    context.emit(':tell', MESSAGES.voice.weatherStationNotFound);
    return false;
  }

  // Things are looking good
  return true;

}

// --- Helpers for intents -----------------------------------------------------

function getTheSensorAvailableMeasurements(sensor) {

    var _data = JSON.parse(getSanitized(JSON.stringify(data)));
    var _sensor = getSanitized(sensor);

    // Exit if the sensor does not exist
    if(!sensorExists(_data, _sensor)) {
      return UTIL.format(MESSAGES.voice.sensorNotFound, sensor);
    }

    var pattern = "[ body.devices[?module_name==`" + _sensor + "`].data_type, body.devices[].modules[?module_name==`" + _sensor + "`].data_type | [] ] | [][]";
    var result = JMESPATH.search(_data, pattern);

    // Replace data types with speech values
    for(var i = 0; i < result.length; i++) {
      result[i] = NAMES[result[i]];
    }

    return UTIL.format(MESSAGES.voice.measurements, sensor, result.join(", "));

}

function getTheWeatherStationSensors() {

    // Find the name of the base station name & all the additional modules
    var pattern = "[ body.devices[].modules[].module_name, body.devices[].module_name ] | []";
    var result = JMESPATH.search(data, pattern);
    return UTIL.format(MESSAGES.voice.sensors, result.join(", "));

}

function getTheWeatherStationData(measurement, sensor) {

    var _data = JSON.parse(getSanitized(JSON.stringify(data)));
    var dataType = NETATMO.slotToDataType[getSanitized(measurement)];
    var _sensor = getSanitized(sensor);

    // console.log("Got '" + measurement + "' on '" + sensor + "'.");
    // console.log("Looking for '" + dataType + "' on '" + _sensor + "'.");

    // Exit if the sensor does not exist
    if(!sensorExists(_data, _sensor)) {
      return UTIL.format(MESSAGES.voice.sensorNotFound, sensor);
    }

    // Exit if the sensor cannot provide with the measurement
    if(!dataTypeProvidedBySensor(_data, dataType, _sensor)) {
      return UTIL.format(MESSAGES.voice.measurementNotFound, measurement, sensor);
    }

    // Get the value...
    var pattern = "[ body.devices[?module_name==`" + _sensor + "`].dashboard_data." + dataType + ", body.devices[].modules[?module_name==`" + _sensor + "`].dashboard_data." + dataType + " | [] ] | []";
    var value = JMESPATH.search(_data, pattern);
    // ... and the unit
    var unit = getUserUnits()[dataType];

    // All good, we've got something to say back to the user
    return UTIL.format(MESSAGES.voice.measurement, NAMES[dataType], value, unit, sensor);

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

  text = text.replace(/[']/g, ""); // Kid's bedroom => Kids bedroom
  return text.toLocaleLowerCase();

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

// Retrieves weather data from the Netatmo API
function getAllWeatherStationData(event, context, callback) {

  // Access token is required
  if(!(event && event.session && event.session.user && event.session.user.accessToken)) {
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
    function(response) {
      response.setEncoding('utf8');
      // On error
      response.on('error', function(error) {
        data = ERRORS.NETATMO_API_ERROR;
        callback(event, context);
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
