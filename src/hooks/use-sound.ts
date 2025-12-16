'use client';

import { useCallback, useEffect, useState } from 'react';

// Sound file paths
const SOUNDS = {
  cycleTransition: '/warframe-sounds/CetInvasionOfferingReady.ogg',
  menuOpen: '/warframe-sounds/MenuDeployDrone.ogg',
  menuClose: '/warframe-sounds/MenuRetrieveDrone.ogg',
} as const;

export type SoundName = keyof typeof SOUNDS;

const STORAGE_KEY = 'warframeclox_sound_enabled';

// Shared audio elements
let sharedAudioRefs: Map<SoundName, HTMLAudioElement> | null = null;
let audioInitialized = false;

function initializeAudio() {
  if (typeof window === 'undefined') return;
  if (audioInitialized) return;

  sharedAudioRefs = new Map();
  Object.entries(SOUNDS).forEach(([name, path]) => {
    const audio = new Audio(path);
    audio.preload = 'auto';
    sharedAudioRefs!.set(name as SoundName, audio);
  });
  audioInitialized = true;
}

export function useSound() {
  // Start with false, read from localStorage on mount
  const [isEnabled, setIsEnabled] = useState(false);

  // Read from localStorage on mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Only enable if explicitly set to 'true'
    const enabled = saved === 'true';
    setIsEnabled(enabled);
    initializeAudio();
  }, []);

  const toggleSound = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const playSound = useCallback((name: SoundName) => {
    if (typeof window === 'undefined') return;

    // Re-read from localStorage to get current state
    const saved = localStorage.getItem(STORAGE_KEY);
    const enabled = saved === 'true';
    
    if (!enabled) {
      return;
    }

    initializeAudio();

    const audio = sharedAudioRefs?.get(name);
    if (!audio) return;

    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignore autoplay restrictions
    });
  }, []);

  return { playSound, isEnabled, toggleSound };
}
