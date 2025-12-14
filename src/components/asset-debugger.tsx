'use client';

import { useEffect, useState } from 'react';

console.log('[AssetDebugger] Module loaded');

type Status = 'checking' | 'success' | 'error';

export function AssetDebugger() {
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('Checking /earth.glb...');
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  console.log('[AssetDebugger] Component rendering');

  useEffect(() => {
    console.log('[AssetDebugger] useEffect running - starting fetch');

    fetch('/earth.glb', { method: 'HEAD' })
      .then((response) => {
        console.log('[AssetDebugger] Fetch response:', response.status, response.statusText);
        setHttpStatus(response.status);
        if (response.ok) {
          setStatus('success');
          setMessage(`/earth.glb OK (${response.status})`);
        } else {
          setStatus('error');
          setMessage(`/earth.glb FAILED (${response.status} ${response.statusText})`);
        }
      })
      .catch((err) => {
        console.error('[AssetDebugger] Fetch error:', err);
        setStatus('error');
        setMessage(`/earth.glb ERROR: ${err.message}`);
      });
  }, []);

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] p-3 rounded border font-mono text-xs"
      style={{
        backgroundColor: status === 'checking' ? 'rgba(59, 130, 246, 0.9)' :
                         status === 'success' ? 'rgba(34, 197, 94, 0.9)' :
                         'rgba(239, 68, 68, 0.9)',
        borderColor: status === 'checking' ? '#3b82f6' :
                     status === 'success' ? '#22c55e' :
                     '#ef4444',
        color: 'white',
      }}
    >
      <div className="font-bold mb-1">Asset Debug</div>
      <div>{message}</div>
      {httpStatus !== null && <div>HTTP: {httpStatus}</div>}
    </div>
  );
}
