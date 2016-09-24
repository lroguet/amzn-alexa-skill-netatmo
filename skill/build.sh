#!/bin/bash

# Move closer to the code
cd src/

# Clean & install additional package(s)
echo Cleaning up workspace && rm -rf node_modules
echo Installing alexa-sdk && npm install alexa-sdk
echo Installing jmespath && npm install jmespath

# Compress the Lambda function
zip -r ../amzn-alexa-skill-netatmo.zip .
