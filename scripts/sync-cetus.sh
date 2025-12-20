#!/bin/bash
# Sync Warframe worldState to Vercel Edge Config
# Stores full payload + extracts Cetus cycle data
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

echo "📡 Fetching worldState from Warframe API..."

# Fetch full worldState payload
RESPONSE=$(curl -sL "https://api.warframe.com/cdn/worldState.php")

if [ -z "$RESPONSE" ]; then
  echo "❌ Failed to fetch from Warframe API"
  exit 1
fi

SYNCED_AT=$(date +%s)000

echo "✅ Got worldState payload ($(echo "$RESPONSE" | wc -c | tr -d ' ') bytes)"

# Extract CetusSyndicate data
CETUS_DATA=$(echo "$RESPONSE" | jq -r '.SyndicateMissions[] | select(.Tag=="CetusSyndicate")')

if [ -z "$CETUS_DATA" ]; then
  echo "❌ Could not find CetusSyndicate in response"
  exit 1
fi

ACTIVATION=$(echo "$CETUS_DATA" | jq -r '.Activation."$date"."$numberLong"')
EXPIRY=$(echo "$CETUS_DATA" | jq -r '.Expiry."$date"."$numberLong"')

echo ""
echo "✅ Cetus cycle data:"
echo "   Activation: $ACTIVATION"
echo "   Expiry:     $EXPIRY"

# Escape the JSON payload for storage
ESCAPED_PAYLOAD=$(echo "$RESPONSE" | jq -c '.')

echo ""
echo "📤 Updating Edge Config..."

# Store full payload + Cetus-specific data
RESULT=$(curl -s -X PATCH "https://api.vercel.com/v1/edge-config/$EDGE_CONFIG_ID/items" \
  -H "Authorization: Bearer $VERCEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {\"operation\": \"upsert\", \"key\": \"worldstate_payload\", \"value\": $ESCAPED_PAYLOAD},
      {\"operation\": \"upsert\", \"key\": \"worldstate_synced_at\", \"value\": $SYNCED_AT},
      {\"operation\": \"upsert\", \"key\": \"cetus_start\", \"value\": $ACTIVATION},
      {\"operation\": \"upsert\", \"key\": \"cetus_end\", \"value\": $EXPIRY},
      {\"operation\": \"upsert\", \"key\": \"synced_at\", \"value\": $SYNCED_AT}
    ]
  }")

if echo "$RESULT" | grep -q '"status":"ok"'; then
  echo "✅ Edge Config updated successfully!"
  echo "   - worldstate_payload (full JSON)"
  echo "   - worldstate_synced_at"
  echo "   - cetus_start"
  echo "   - cetus_end"
  echo "   - synced_at"
  echo ""
  echo "🔄 Verify at: https://warframeclox.vercel.app/api/cetus"
else
  echo "❌ Failed to update Edge Config:"
  echo "$RESULT"
  exit 1
fi
