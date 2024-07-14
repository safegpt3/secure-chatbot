#!/bin/bash

set -e

# Check if environment parameter is passed
if [[ -z "$1" ]]; then
  echo "Environment parameter (staging or production) is required. Exiting."
  exit 1
fi

ENVIRONMENT=$1

# Check if the required environment variables are set
if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" || -z "$AWS_REGION" ]]; then
  echo "AWS credentials, region, or SAM S3 bucket are not set. Exiting."
  exit 1
fi

# Variables
STACK_NAME="secure-chatbot-frontend-$ENVIRONMENT"
BUILD_DIR="frontend/dist"
REGION=$AWS_REGION
SAM_S3_BUCKET="secure-chatbot-frontend-artifacts-bucket-$ENVIRONMENT"

# Check if the S3 bucket exists and create if it does not
if aws s3 ls "s3://$SAM_S3_BUCKET" 2>&1 | grep -q 'NoSuchBucket'
then
  echo "Creating S3 bucket: $SAM_S3_BUCKET"
  aws s3 mb "s3://$SAM_S3_BUCKET" --region $REGION
else
  echo "S3 bucket $SAM_S3_BUCKET already exists"
fi

# Build the SAM application
echo "Building SAM application..."
sam build --template-file frontend/template.yaml
if [ $? -ne 0 ]; then
  echo "SAM build failed"
  exit 1
fi

# Deploy the SAM application
echo "Deploying SAM application..."
sam deploy --stack-name $STACK_NAME --s3-bucket $SAM_S3_BUCKET --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --region $REGION --no-fail-on-empty-changeset
if [ $? -ne 0 ]; then
  echo "SAM deploy failed"
  exit 1
fi

# Wait for the stack to be created or updated
echo "Waiting for stack to be created or updated..."
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION || \
aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION

if [ $? -ne 0 ]; then
  echo "Stack creation or update failed"
  exit 1
fi

echo "Stack created or updated successfully!"

# Get the bucket name and CloudFront distribution ID from the stack outputs
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='WebAppS3BucketName'].OutputValue" --output text --region $REGION)
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text --region $REGION)

if [ -z "$BUCKET_NAME" ]; then
  echo "Failed to get S3 bucket name from stack outputs"
  exit 1
fi

if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo "Failed to get CloudFront distribution ID from stack outputs"
  exit 1
fi

echo "S3 Bucket Name: $BUCKET_NAME"
echo "CloudFront Distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"

# Upload the React build directory to the S3 bucket
echo "Uploading React app to S3 bucket..."
aws s3 sync $BUILD_DIR/ s3://$BUCKET_NAME/

if [ $? -ne 0 ]; then
  echo "Failed to upload files to S3"
  exit 1
fi

echo "React app uploaded successfully"

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" --query "Invalidation.Id" --output text)

if [ -z "$INVALIDATION_ID" ]; then
  echo "Failed to create CloudFront invalidation"
  exit 1
fi

echo "CloudFront invalidation created with ID: $INVALIDATION_ID"

# Get the CloudFront distribution domain name
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='WebAppDomain'].OutputValue" --output text --region $REGION)

if [ -z "$CLOUDFRONT_URL" ]; then
  echo "Failed to get CloudFront URL from stack outputs"
  exit 1
fi

echo "CloudFront URL: $CLOUDFRONT_URL"

echo "Deployment complete. Your React app is available at: $CLOUDFRONT_URL"