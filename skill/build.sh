#!/bin/bash

# Move closer to the code
cd src/

# Install additional packages
npm install

# Compress the Lambda function
zip -r ../amzn-alexa-skill-netatmo.zip .
