# Foreword
**Atmo** is an **Alexa skill for Netatmo** personal weather stations.

# Setup
**Atmo** supports oAuth so you only need to grant the skill access to your Netatmo weather station from the Alexa companion App when you enable the skill for the first time.

![Netatmo Weather Station](https://raw.githubusercontent.com/lroguet/amzn-alexa-skill-netatmo/master/assets/images/netatmo-weather-station.jpg)

# Supported measurements
* carbon dioxide level
* gust speed
* humidity
* noise level
* pressure
* rainfall
* temperature
* wind speed

# Usage
## List available sensors (ListSensors)
> Alexa, ask atmo what are my sensors?   
> Alexa, ask atmo what sensors do I have?

For the intents below, let's assume the response to a *ListSensors* intent was: *You can retrieve weather data from the following sensors: __indoors__, __outdoors__, __kid's bedroom__.*

## List available measurements (ListMeasurements)

> Alexa, ask atmo what are the measurements available indoors?   
> Alexa, ask atmo to list the measurements available in the kid's bedroom.

## Get measurements (GetMeasurement)

> Alexa, ask atmo what's the temperature indoors?   
> Alexa, ask atmo to give me the humidity outdoors.   
> Alexa, ask atmo to tell me the carbon dioxide level in the kid's bedroom.

Rinse and repeat with other measurements (_noise level_, _pressure_ & _wind speed_ for example) and sensors.

# Behind the scenes
Here is a simple but nice *Datadog* dashboard showing some of the behind the scenes metrics for the **Atmo** Alexa skill: https://p.datadoghq.com/sb/8e976d062-778e4deb2a

# Q&A
## What if I don't specify a sensor?

> Alexa, ask atmo to list the measurements available.   
> Alexa, ask atmo to give me the humidity.

**Atmo** will try to retrieve a list of available measurements or the specified measurement from your base station or the first base station if you have several.

# To do

See the [enhancements](https://github.com/lroguet/amzn-alexa-skill-netatmo/labels/enhancement) to-do list.

# Affiliate links
These are like donate buttons except you don't have to donate anything.
* [Atmo](http://amzn.to/2fGvBIl) on Amazon.com
* [Netatmo weather station](http://amzn.to/2ezRDtp) on Amazon.com
* [Additional indoor module for Netatmo weather station](http://amzn.to/2eA4V9h) on Amazon.com
* [Wind gauge for Netatmo weather station](http://amzn.to/2fGCk4T) on Amazon.com
* [Rain gauge for Netatmo weather station](http://amzn.to/2ebIiJY) on Amazon.com
