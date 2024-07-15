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

# Define the S3 bucket
S3_BUCKET="secure-chatbot-backend-artifacts-bucket"

# Check the S3 bucket status
bucketstatus=$(aws s3api head-bucket --bucket "${S3_BUCKET}" 2>&1)
if echo "${bucketstatus}" | grep 'Not Found'; then
  echo "Bucket doesn't exist, creating bucket: $S3_BUCKET"
  aws s3 mb s3://$S3_BUCKET --region $AWS_REGION
  if [[ $? -ne 0 ]]; then
    echo "Failed to create bucket. Exiting."
    exit 1
  fi
elif echo "${bucketstatus}" | grep 'Forbidden'; then
  echo "Bucket exists but not owned by you. Exiting."
  exit 1
elif echo "${bucketstatus}" | grep 'Bad Request'; then
  echo "Bucket name specified is less than 3 or greater than 63 characters. Exiting."
  exit 1
else
  echo "S3 bucket $S3_BUCKET already exists"
fi

# Build the SAM application
echo "Building the SAM application..."
sam build --template-file backend/template.yaml

# Package the SAM application
echo "Packaging the SAM application..."
sam package \
  --output-template-file packaged.yaml \
  --s3-bucket $S3_BUCKET \
  --region $AWS_REGION

# Deploy the SAM application
echo "Deploying the SAM application..."
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

# Output the stack outputs
echo "Fetching stack outputs..."
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --region $AWS_REGION
