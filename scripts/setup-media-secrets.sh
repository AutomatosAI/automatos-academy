#!/usr/bin/env bash
# One-time setup for the academy media CDN (docs/VIDEO_HOSTING.md).
#
# What it does — in your terminal, with nothing sensitive printed:
#   1. Creates a LEAST-PRIVILEGE IAM user (automatos-academy-media-deploy):
#      s3:PutObject on automatos-widget-sdk/academy/* + ListBucket on that
#      prefix + cloudfront:CreateInvalidation on the widgets distribution.
#      (Deliberately NOT your root key — root creds must never live in
#      GitHub Actions.)
#   2. Mints an access key for that user.
#   3. Sets the five AWS_SDK_DEPLOY_* Actions secrets on automatos-academy.
#
# Usage:
#   bash scripts/setup-media-secrets.sh [path-to-env-with-admin-aws-creds]
# Default env: ../automatos-ai/orchestrator/.env (root creds — used ONLY to
# create the scoped user; they are not stored anywhere).
set -euo pipefail

ENV_FILE="${1:-/Users/gkavanagh/Development/Automatos-AI-Platform/automatos-ai/orchestrator/.env}"
REPO="AutomatosAI/automatos-academy"
USER_NAME="automatos-academy-media-deploy"
BUCKET="automatos-widget-sdk"
DIST_ID="E2ED1OCUMIRX7Q"          # CloudFront distro for widgets.automatos.app
ACCOUNT_ID="810390208173"

[ -f "$ENV_FILE" ] || { echo "env file not found: $ENV_FILE" >&2; exit 1; }
command -v aws >/dev/null || { echo "aws CLI not installed" >&2; exit 1; }
command -v gh  >/dev/null || { echo "gh CLI not installed" >&2; exit 1; }

set -a; # shellcheck disable=SC1090
source "$ENV_FILE" >/dev/null 2>&1 || true; set +a
export AWS_REGION AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

echo "→ admin identity: $(aws sts get-caller-identity --query Arn --output text)"

LOC=$(aws s3api get-bucket-location --bucket "$BUCKET" --query LocationConstraint --output text)
{ [ "$LOC" = "None" ] || [ "$LOC" = "null" ]; } && LOC=us-east-1
echo "→ bucket $BUCKET region: $LOC"

if aws iam get-user --user-name "$USER_NAME" >/dev/null 2>&1; then
  echo "→ IAM user exists: $USER_NAME"
else
  aws iam create-user --user-name "$USER_NAME" >/dev/null
  echo "→ IAM user created: $USER_NAME"
fi

POLICY=$(cat << JSON
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "AcademyMediaWrite", "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::$BUCKET/academy/*" },
    { "Sid": "AcademyMediaList", "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::$BUCKET",
      "Condition": { "StringLike": { "s3:prefix": "academy/*" } } },
    { "Sid": "AcademyInvalidate", "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
      "Resource": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID" }
  ]
}
JSON
)
aws iam put-user-policy --user-name "$USER_NAME" \
  --policy-name academy-media-deploy --policy-document "$POLICY"
echo "→ least-privilege policy attached"

# IAM users hold max 2 access keys — clean out old ones for idempotent re-runs.
for old in $(aws iam list-access-keys --user-name "$USER_NAME" \
               --query 'AccessKeyMetadata[].AccessKeyId' --output text); do
  aws iam delete-access-key --user-name "$USER_NAME" --access-key-id "$old"
  echo "→ rotated out old access key ${old:0:8}…"
done

KEYS_JSON=$(aws iam create-access-key --user-name "$USER_NAME" --output json)
NEW_ID=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["AccessKey"]["AccessKeyId"])' <<< "$KEYS_JSON")
NEW_SECRET=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["AccessKey"]["SecretAccessKey"])' <<< "$KEYS_JSON")
unset KEYS_JSON
echo "→ fresh access key minted (values not printed)"

gh secret set AWS_SDK_DEPLOY_ACCESS_KEY_ID     --repo "$REPO" --body "$NEW_ID"
gh secret set AWS_SDK_DEPLOY_SECRET_ACCESS_KEY --repo "$REPO" --body "$NEW_SECRET"
gh secret set AWS_SDK_DEPLOY_REGION            --repo "$REPO" --body "$LOC"
gh secret set AWS_SDK_DEPLOY_BUCKET            --repo "$REPO" --body "$BUCKET"
gh secret set AWS_SDK_DEPLOY_DISTRIBUTION_ID   --repo "$REPO" --body "$DIST_ID"
unset NEW_ID NEW_SECRET

echo "→ secrets set on $REPO:"
gh secret list --repo "$REPO"
echo
echo "Done. Next: merge PRs #7→#8→#9, then run Actions → 'Deploy academy media to CDN' → mode 'migrate'."
