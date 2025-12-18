#!/bin/bash
# Sync Cetus cycle data from Warframe API to Vercel Edge Config
# Run this locally when you notice timer drift

set -e

# Load environment variables from .env.local if not set
if [ -z "$VERCEL_ACCESS_TOKEN" ] || [ -z "$EDGE_CONFIG_ID" ]; then
  if [ -f ".env.local" ]; then
    export $(grep -E '^(VERCEL_ACCESS_TOKEN|EDGE_CONFIG_ID)=' .env.local | xargs)
  fi
fi

if [ -z "$VERCEL_ACCESS_TOKEN" ]; then
  echo "❌ VERCEL_ACCESS_TOKEN not set. Add it to .env.local or export it."
  exit 1
fi

if [ -z "$EDGE_CONFIG_ID" ]; then
  echo "❌ EDGE_CONFIG_ID not set. Add it to .env.local or export it."
  exit 1
fi

echo "📡 Fetching Cetus data from Warframe API..."

# Fetch and extract Cetus data
RESPONSE=$(curl -sL "https://api.warframe.com/cdn/worldState.php")

if [ -z "$RESPONSE" ]; then
  echo "❌ Failed to fetch from Warframe API"
  exit 1
fi

# Extract CetusSyndicate data using jq
CETUS_DATA=$(echo "$RESPONSE" | jq -r '.SyndicateMissions[] | select(.Tag=="CetusSyndicate")')

if [ -z "$CETUS_DATA" ]; then
  echo "❌ Could not find CetusSyndicate in response"
  exit 1
fi

ACTIVATION=$(echo "$CETUS_DATA" | jq -r '.Activation."$date"."$numberLong"')
EXPIRY=$(echo "$CETUS_DATA" | jq -r '.Expiry."$date"."$numberLong"')
SYNCED_AT=$(date +%s)000

echo "✅ Cetus cycle data:"
echo "   Activation: $ACTIVATION"
echo "   Expiry:     $EXPIRY"
echo "   Synced at:  $SYNCED_AT"

echo ""
echo "📤 Updating Edge Config..."

RESULT=$(curl -s -X PATCH "https://api.vercel.com/v1/edge-config/$EDGE_CONFIG_ID/items" \
  -H "Authorization: Bearer $VERCEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {\"operation\": \"upsert\", \"key\": \"cetus_start\", \"value\": $ACTIVATION},
      {\"operation\": \"upsert\", \"key\": \"cetus_end\", \"value\": $EXPIRY},
      {\"operation\": \"upsert\", \"key\": \"synced_at\", \"value\": $SYNCED_AT}
    ]
  }")

if echo "$RESULT" | grep -q '"status":"ok"'; then
  echo "✅ Edge Config updated successfully!"
  echo ""
  echo "🔄 Verify at: https://warframeclox.vercel.app/api/cetus"
else
  echo "❌ Failed to update Edge Config:"
  echo "$RESULT"
  exit 1
fi
