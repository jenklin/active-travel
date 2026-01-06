#!/bin/bash

# Active Living Lab Deployment Script for Google Cloud Run
# Usage: ./deploy.sh [staging|prod]
# Deploys Active Living Lab as standalone service

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate we're in the correct directory
REQUIRED_DIR="active-travel"
CURRENT_DIR=$(basename "$PWD")

if [[ "$CURRENT_DIR" != "$REQUIRED_DIR" ]]; then
  echo -e "${RED}ERROR: Wrong directory!${NC}"
  echo ""
  echo "This script deploys: ${GREEN}Active Living Lab${NC}"
  echo "Expected directory:  ${GREEN}cloudpeers-mcp/active-travel${NC}"
  echo "Current directory:   ${RED}$CURRENT_DIR${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓ Correct directory: cloudpeers-mcp/active-travel${NC}"
echo -e "${GREEN}✓ Deploying: Active Living Lab${NC}"
echo ""

# Load environment variables from .env file
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    if [[ ! "$key" =~ ^#.* ]] && [[ -n "$key" ]]; then
      value=$(echo "$value" | sed 's/#.*//' | xargs)
      export "$key=$value"
    fi
  done < .env
fi

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-heli-ent}"
REGION="${CLOUD_RUN_REGION:-us-central1}"
IMAGE_NAME="active-living-lab"

# Parse environment argument
ENV=${1:-staging}

if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo -e "${RED}Error: Environment must be 'staging' or 'prod'${NC}"
  echo "Usage: ./deploy.sh [staging|prod]"
  exit 1
fi

# Environment-specific configuration
if [ "$ENV" = "prod" ]; then
  SERVICE_NAME="active-living-lab-prod"
  DOMAIN_PRIMARY="active-living.cloudpeers.com"
  MAX_INSTANCES=10
  MIN_INSTANCES=1
  MEMORY="1Gi"
  CPU=2
  CONCURRENCY=80
  echo -e "${YELLOW}Deploying to PRODUCTION${NC}"
  echo -e "${GREEN}Domain: ${DOMAIN_PRIMARY}${NC}"

  # Confirmation for production
  read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
  fi
else
  SERVICE_NAME="active-living-lab-staging"
  DOMAIN="active-living-staging.cloudpeers.com"
  MAX_INSTANCES=5
  MIN_INSTANCES=0
  MEMORY="512Mi"
  CPU=1
  CONCURRENCY=80
  echo -e "${YELLOW}Deploying to STAGING${NC}"
  echo -e "${GREEN}Domain: ${DOMAIN}${NC}"
fi

# Build timestamp for image tag
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="${ENV}-${TIMESTAMP}"
IMAGE_URI="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

echo -e "${GREEN}Step 1: Building with Cloud Build${NC}"
echo "Image URI: ${IMAGE_URI}"

# Submit build to Cloud Build
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="_IMAGE_URI=${IMAGE_URI}" \
  --project="${PROJECT_ID}" \
  --timeout=20m

echo -e "${GREEN}Step 2: Deploying to Cloud Run${NC}"

# Deploy to Cloud Run
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_URI}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --concurrency="${CONCURRENCY}" \
  --port=8080 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID},LAB_ID=active-living-lab" \
  --update-secrets="DATABASE_URL=DATABASE_URL:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,CLOUDPEERS_PLATFORM_URL=CLOUDPEERS_PLATFORM_URL:latest" \
  --timeout=300 \
  --no-cpu-throttling \
  --cpu-boost \
  --execution-environment=gen2

echo -e "${GREEN}Step 3: Retrieving service URL${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo ""
echo -e "${GREEN}✓ Deployment successful!${NC}"
echo ""
echo "Environment: ${ENV}"
echo "Service: ${SERVICE_NAME}"
echo "Image: ${IMAGE_URI}"
echo "URL: ${SERVICE_URL}"
if [ "$ENV" = "prod" ]; then
  echo "Domain: ${DOMAIN_PRIMARY}"
else
  echo "Domain: ${DOMAIN}"
fi
echo ""

# Test the health endpoint
echo -e "${GREEN}Testing health endpoint...${NC}"
sleep 5
curl "${SERVICE_URL}/health" || echo -e "${RED}Health check failed${NC}"
echo ""

# Domain mapping instructions
if [ "$ENV" = "prod" ]; then
  echo -e "${YELLOW}Next Steps for Production:${NC}"
  echo "1. Map domain to Cloud Run:"
  echo "   gcloud run domain-mappings create --service ${SERVICE_NAME} --domain ${DOMAIN_PRIMARY} --region ${REGION}"
  echo ""
  echo "2. Update DNS records to point to Cloud Run"
  echo ""
fi

echo -e "${YELLOW}Service URLs:${NC}"
echo "1. Health check: ${SERVICE_URL}/health"
echo "2. Lab info: ${SERVICE_URL}/api/platform/lab/info"
echo "3. Lab manifest: ${SERVICE_URL}/api/platform/lab/manifest"
echo ""

echo -e "${YELLOW}Integration with CarePeers:${NC}"
echo "Update CarePeers routing to point to: ${SERVICE_URL}"
echo "See DEPLOYMENT_CHECKLIST.md Step 2 for details"
echo ""
