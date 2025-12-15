'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

// Sound file paths
const SOUNDS = {
  cycleTransition: '/warframe-sounds/CetInvasionOfferingReady.ogg',
  menuOpen: '/warframe-sounds/UICommonDialogOpen.ogg',
  menuClose: '/warframe-sounds/UICommonDialogClose.ogg',
} as const;

export type SoundName = keyof typeof SOUNDS;

// Track playing state per sound to prevent overlapping
const playingState: Record<string, boolean> = {};

const STORAGE_KEY = 'warframeclox_sound_enabled';

export function useSound() {
  const [isEnabled, setIsEnabled] = useState(false);
  const audioRefs = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPreference = localStorage.getItem(STORAGE_KEY);
    // Default to true if no preference saved
    setIsEnabled(savedPreference === null ? true : savedPreference === 'true');
  }, []);

  // Preload audio files on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    Object.entries(SOUNDS).forEach(([name, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audioRefs.current.set(name as SoundName, audio);
    });

    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  const toggleSound = useCallback(() => {
    setIsEnabled((prev) => {
      const newState = !prev;
      localStorage.setItem(STORAGE_KEY, String(newState));
      return newState;
    });
  }, []);

  const playSound = useCallback((name: SoundName, force = false) => {
    if (typeof window === 'undefined') return;

    // Check if sound is enabled (unless forced for UI sounds like menu)
    if (!force && !isEnabled) return;

    // Prevent overlapping playback of the same sound
    if (playingState[name]) return;

    const audio = audioRefs.current.get(name);
    if (!audio) return;

    playingState[name] = true;

    // Reset to start in case it was partially played
    audio.currentTime = 0;

    audio.play().catch((error) => {
      // Ignore autoplay restrictions - user hasn't interacted yet
      console.log(`[Sound] Could not play ${name}:`, error.message);
      playingState[name] = false;
    });

    // Mark as not playing when finished
    const handleEnded = () => {
      playingState[name] = false;
      audio.removeEventListener('ended', handleEnded);
    };
    audio.addEventListener('ended', handleEnded);
  }, [isEnabled]);

  return { playSound, isEnabled, toggleSound };
}
