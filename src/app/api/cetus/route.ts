// Server-side API route for Cetus cycle data
// Debug: Testing Edge Config connection

import { get } from '@vercel/edge-config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: { env: Record<string, string | undefined> };

export async function GET() {
  // #region agent log H1
  // Hypothesis 1: Check if EDGE_CONFIG env var exists
  const edgeConfigEnv = process.env.EDGE_CONFIG;
  fetch('http://127.0.0.1:7242/ingest/22ed322e-28b1-4acf-95e2-dd511b155c77',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:H1',message:'EDGE_CONFIG env var',data:{exists:!!edgeConfigEnv,value:edgeConfigEnv?.substring(0,50),length:edgeConfigEnv?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // #region agent log H2
  // Hypothesis 2: Check format of connection string
  const hasToken = edgeConfigEnv?.includes('token=');
  const hasEdgeConfigDomain = edgeConfigEnv?.includes('edge-config.vercel.com');
  const hasEcfgId = edgeConfigEnv?.includes('ecfg_');
  fetch('http://127.0.0.1:7242/ingest/22ed322e-28b1-4acf-95e2-dd511b155c77',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:H2',message:'Connection string format',data:{hasToken,hasEdgeConfigDomain,hasEcfgId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // #region agent log H3-H5
  // Hypothesis 3-5: Try to call SDK get() and capture result/error
  let sdkResult: unknown = null;
  let sdkError: string | null = null;
  try {
    sdkResult = await get<number>('cetus_cycle_start');
    fetch('http://127.0.0.1:7242/ingest/22ed322e-28b1-4acf-95e2-dd511b155c77',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:H3-success',message:'SDK get() succeeded',data:{result:sdkResult,type:typeof sdkResult},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  } catch (err) {
    sdkError = err instanceof Error ? err.message : String(err);
    fetch('http://127.0.0.1:7242/ingest/22ed322e-28b1-4acf-95e2-dd511b155c77',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:H3-error',message:'SDK get() threw error',data:{error:sdkError,errorType:err?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  }
  // #endregion

  // Return debug info directly
  return Response.json({
    debug: true,
    env: {
      exists: !!edgeConfigEnv,
      length: edgeConfigEnv?.length,
      preview: edgeConfigEnv?.substring(0, 60),
    },
    sdk: {
      result: sdkResult,
      error: sdkError,
    },
    timestamp: Date.now(),
  });
}
