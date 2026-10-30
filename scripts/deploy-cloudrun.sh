#!/usr/bin/env bash
# Deploy PlateProof to Cloud Run. Secrets come from Secret Manager; nothing is baked into the image.
set -euo pipefail
G=${GCLOUD:-/c/Users/ankit/tools/google-cloud-sdk/bin/gcloud.cmd}
PROJECT=$($G config get-value project 2>/dev/null); REGION=${REGION:-asia-south1}; SVC=plateproof
source .env
for s in MODEL_API_KEY BASETEN_API_KEY; do
  if ! $G secrets describe plateproof-$s --project "$PROJECT" >/dev/null 2>&1; then printf '%s' "${!s}" | $G secrets create plateproof-$s --data-file=- --project "$PROJECT"; else printf '%s' "${!s}" | $G secrets versions add plateproof-$s --data-file=- --project "$PROJECT"; fi
done
$G run deploy $SVC --source . --region "$REGION" --project "$PROJECT" --allow-unauthenticated --memory 1Gi --cpu 1 --timeout 600 --concurrency 20 --min-instances "${MIN_INSTANCES:-0}" --max-instances 3 \
  --set-secrets MODEL_API_KEY=plateproof-MODEL_API_KEY:latest,BASETEN_API_KEY=plateproof-BASETEN_API_KEY:latest
$G run services describe $SVC --region "$REGION" --project "$PROJECT" --format="value(status.url)"
