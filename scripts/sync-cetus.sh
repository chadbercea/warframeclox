#!/bin/bash
# Local sync script - run this from your machine to update Edge Config
# Usage: ./scripts/sync-cetus.sh

set -e

echo "Fetching Cetus cycle from Warframe API..."
RESPONSE=$(curl -sL "https://api.warframe.com/cdn/worldState.php")

CETUS_DATA=$(echo "$RESPONSE" | jq -r '.SyndicateMissions[] | select(.Tag == "CetusSyndicate")')

if [ -z "$CETUS_DATA" ]; then
  echo "Failed to get Cetus data"
  exit 1
fi

CYCLE_START=$(echo "$CETUS_DATA" | jq -r '.Activation."$date"."$numberLong"')
CYCLE_END=$(echo "$CETUS_DATA" | jq -r '.Expiry."$date"."$numberLong"')
SYNCED_AT=$(date +%s)000

echo "Cetus cycle: start=$CYCLE_START, end=$CYCLE_END"

# Get secrets from GitHub
VERCEL_ACCESS_TOKEN=$(gh secret list -R chadbercea/warframeclox 2>/dev/null | grep -q VERCEL_ACCESS_TOKEN && echo "exists" || echo "")

if [ -z "$VERCEL_ACCESS_TOKEN" ]; then
  echo ""
  echo "To update Edge Config, you need to set these environment variables:"
  echo "  export VERCEL_ACCESS_TOKEN=<your-token>"
  echo "  export EDGE_CONFIG_ID=ecfg_i7wukxkcxmejcih7vtkpfcthms6b"
  echo "  export VERCEL_TEAM_ID=<your-team-id>"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "Updating Edge Config..."
curl -X PATCH "https://api.vercel.com/v1/edge-config/$EDGE_CONFIG_ID/items?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {\"operation\": \"upsert\", \"key\": \"cetus_start\", \"value\": $CYCLE_START},
      {\"operation\": \"upsert\", \"key\": \"cetus_end\", \"value\": $CYCLE_END},
      {\"operation\": \"upsert\", \"key\": \"synced_at\", \"value\": $SYNCED_AT}
    ]
  }"

echo ""
echo "Done! Edge Config updated."


