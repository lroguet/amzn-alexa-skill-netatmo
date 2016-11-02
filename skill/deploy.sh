NAME='atmo-intent-processing'
REGION='us-east-1'

# Update the AWS Lambda function
aws lambda update-function-code --function-name $NAME --zip-file fileb://amzn-alexa-skill-netatmo.zip --profile fourteenislands --region $REGION
## Create a version for LATEST
aws lambda publish-version --function-name $NAME --profile fourteenislands --region $REGION
# Move 'development' alias to the freshly deployed code
aws lambda update-alias --function-name $NAME --name development --function-version '$LATEST' --profile fourteenislands --region $REGION
