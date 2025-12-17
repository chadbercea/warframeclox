'use client';

import { useToast } from '@/contexts/toast-context';
import { useState } from 'react';

export function ToastTestButton() {
  const { showToast } = useToast();
  const [isDay, setIsDay] = useState(true);

  const handleTest = () => {
    const currentState = isDay ? 'Day' : 'Night';
    showToast({
      title: `${currentState} Cycle`,
      message: `The Plains of Eidolon are now in ${currentState.toLowerCase()} time.`,
      icon: isDay ? 'sun' : 'moon',
      duration: 5000,
    });
    setIsDay(!isDay); // Toggle for next test
  };

  return (
    <button
      onClick={handleTest}
      className="fixed top-4 right-4 z-50 px-4 py-2 rounded"
      style={{
        backgroundColor: 'rgba(201, 169, 97, 0.2)',
        border: '1px solid var(--color-gold-primary)',
        color: 'var(--color-gold-primary)',
        fontFamily: 'var(--font-noto-sans), sans-serif',
        fontSize: '12px',
      }}
    >
      Test Toast ({isDay ? 'Day' : 'Night'})
    </button>
  );
}

