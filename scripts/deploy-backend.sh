#!/bin/bash

# Deploy-backend

set -e

# Check if the required environment variables are set
if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" || -z "$AWS_REGION" ]]; then
  echo "AWS credentials or region are not set. Exiting."
  exit 1
fi

# Ensure the AWS CLI and SAM CLI are installed
if ! command -v aws &> /dev/null; then
  echo "AWS CLI is not installed. Exiting."
  exit 1
fi

if ! command -v sam &> /dev/null; then
  echo "SAM CLI is not installed. Exiting."
  exit 1
fi

# Check if environment parameter is passed
if [[ -z "$1" ]]; then
  echo "Environment parameter (staging or production) is required. Exiting."
  exit 1
fi

ENVIRONMENT=$1

# Define the stack name
STACK_NAME="secure-chatbot-backend-$ENVIRONMENT"

# Build the SAM application
sam build --template-file backend/template.yaml

# Package the SAM application
sam package \
  --output-template-file packaged.yaml \
  --s3-bucket secure-chatbot-backend-artifacts-bucket \
  --region $AWS_REGION

# Deploy the SAM application
sam deploy \
  --template-file packaged.yaml \
  --stack-name $STACK_NAME \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region $AWS_REGION \
  --parameter-overrides \
    ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
    ParameterKey=OpenaiApiKey,ParameterValue=$OPENAI_API_KEY \
    ParameterKey=BotpressToken,ParameterValue=$BOTPRESS_TOKEN \
    ParameterKey=BotpressEndpoint,ParameterValue=$BOTPRESS_ENDPOINT

# Capture the exit code of the SAM deployment
DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo "Deployment succeeded."
elif [ $DEPLOY_EXIT_CODE -eq 1 ]; then
    if grep -q "No changes to deploy" /home/runner/work/secure-chatbot/secure-chatbot/packaged.yaml; then
        echo "No changes detected. Exiting gracefully."
        exit 0
    else
        echo "Deployment failed with unexpected errors."
        exit 1
    fi
else
    echo "Deployment failed with exit code $DEPLOY_EXIT_CODE."
    exit $DEPLOY_EXIT_CODE
fi

# Output the stack outputs
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --region $AWS_REGION
