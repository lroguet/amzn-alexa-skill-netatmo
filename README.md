# Amazon Echo, Dot, Tap, ... and Netatmo

## Foreword
**Atmo** is an **Alexa skill for Netatmo** weather stations. Unlike [Netatmo-Alexa](https://github.com/andypiper/Netatmo-Alexa) (which I had a look at to get started) **Atmo** makes its requests towards a non-deprecated (as of May, 2016) Netatmo API & uses oAuth for authentication.

I tried to make it as easy as possible to extend the skill with new intents, utterances and texts to be converted to speech and spoken back to the user (you) but, as always, there has to be room for improvements. Feel free to fork and create pull requests.

## Setup
The skill supports oAuth so you only need to grant the skill access to your Netatmo weather station measurements from the Alexa App when you enable the skill for the first time.

![Netatmo Weather Station](https://github.com/lroguet/amazon-echo-netatmo/blob/master/assets/images/netatmo-weather-station.jpg)

## Supported measurements
* carbon dioxide level
* humidity
* noise level
* pressure
* temperature

## Usage
### List sensors
> Alexa, ask atmo what are my sensors?   
> Alexa, ask atmo what sensors do I have?

### Get measurements
Assume the answer to *List sensors* was 'You can retrieve weather data from the following sensors: indoors, outdoors.' you can now try saying:

> Alexa, ask atmo what's the temperature indoors?   
> Alexa, ask atmo to give me the humidity outdoors.

*Rinse and repeat with other measurements: "carbon dioxide level", "noise level" & "pressure" for example.*

## Behind the scenes
Here is a simple but nice *Datadog* dashboard showing some of the behind the scenes metrics for the **Atmo** Alexa skill: https://p.datadoghq.com/sb/8e976d062-778e4deb2a

## Q&A
### What if I don't specify a sensor?

> Alexa, ask atmo to give me the humidity

**Atmo** will try to retrieve the measurement from your base station (or the first base station if you have several).
