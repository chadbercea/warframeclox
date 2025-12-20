/**
 * Sync Warframe worldState to Vercel storage
 * - Full payload → Vercel Blob (for future clocks)
 * - Cetus data → Edge Config (for Cetus clock)
 * 
 * Run: npm run sync
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { put } from '@vercel/blob';

// Types for Warframe API response
interface WorldStateResponse {
  SyndicateMissions?: Array<{
    Tag: string;
    Activation: { $date: { $numberLong: string } };
    Expiry: { $date: { $numberLong: string } };
  }>;
  [key: string]: unknown;
}

async function main() {
  const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  const VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN;
  const EDGE_CONFIG_ID = process.env.EDGE_CONFIG_ID;

  if (!BLOB_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN not set');
    process.exit(1);
  }
  if (!VERCEL_TOKEN || !EDGE_CONFIG_ID) {
    console.error('❌ VERCEL_ACCESS_TOKEN or EDGE_CONFIG_ID not set');
    process.exit(1);
  }

  console.log('📡 Fetching worldState from Warframe API...');

  // Fetch full worldState
  const response = await fetch('https://api.warframe.com/cdn/worldState.php');
  if (!response.ok) {
    console.error('❌ Failed to fetch from Warframe API:', response.status);
    process.exit(1);
  }

  const worldState: WorldStateResponse = await response.json();
  const payloadSize = JSON.stringify(worldState).length;
  const syncedAt = Date.now();

  console.log(`✅ Got worldState payload (${(payloadSize / 1024).toFixed(1)} KB)`);

  // Store full payload in Vercel Blob
  console.log('\n📤 Uploading to Vercel Blob...');
  const blob = await put('warframe/worldState.json', JSON.stringify(worldState), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log(`✅ Blob stored at: ${blob.url}`);

  // Extract Cetus data
  const cetusMission = worldState.SyndicateMissions?.find(m => m.Tag === 'CetusSyndicate');
  if (!cetusMission) {
    console.error('❌ Could not find CetusSyndicate in response');
    process.exit(1);
  }

  const cetusStart = parseInt(cetusMission.Activation.$date.$numberLong, 10);
  const cetusEnd = parseInt(cetusMission.Expiry.$date.$numberLong, 10);

  console.log('\n✅ Cetus cycle data:');
  console.log(`   Start: ${cetusStart}`);
  console.log(`   End:   ${cetusEnd}`);

  // Update Edge Config with Cetus data + blob URL
  console.log('\n📤 Updating Edge Config...');
  const edgeResponse = await fetch(
    `https://api.vercel.com/v1/edge-config/${EDGE_CONFIG_ID}/items`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          { operation: 'upsert', key: 'worldstate_blob_url', value: blob.url },
          { operation: 'upsert', key: 'worldstate_synced_at', value: syncedAt },
          { operation: 'upsert', key: 'cetus_start', value: cetusStart },
          { operation: 'upsert', key: 'cetus_end', value: cetusEnd },
          { operation: 'upsert', key: 'synced_at', value: syncedAt },
        ],
      }),
    }
  );

  const result = await edgeResponse.json();
  
  if (result.status === 'ok') {
    console.log('✅ Edge Config updated!');
    console.log('   - worldstate_blob_url');
    console.log('   - worldstate_synced_at');
    console.log('   - cetus_start');
    console.log('   - cetus_end');
    console.log('   - synced_at');
    console.log('\n🔄 Verify at: https://www.warframeclocx.com/api/cetus');
  } else {
    console.error('❌ Failed to update Edge Config:', result);
    process.exit(1);
  }
}

main().catch(console.error);

