'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

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

// Shared audio elements across all hook instances
let sharedAudioRefs: Map<SoundName, HTMLAudioElement> | null = null;
let audioInitialized = false;

// Shared state management for sound enabled across all hook instances
let soundEnabled = true; // Default to true
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return soundEnabled;
}

function getServerSnapshot() {
  return true; // Default for SSR
}

function initializeFromStorage() {
  if (typeof window === 'undefined') return;
  const savedPreference = localStorage.getItem(STORAGE_KEY);
  soundEnabled = savedPreference === null ? true : savedPreference === 'true';
}

export function useSound() {
  // Use useSyncExternalStore for shared state across all hook instances
  const isEnabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Initialize from localStorage on first mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize shared state from localStorage (only once)
    initializeFromStorage();
    notifyListeners();

    // Initialize shared audio elements (only once)
    if (!audioInitialized) {
      sharedAudioRefs = new Map();
      Object.entries(SOUNDS).forEach(([name, path]) => {
        const audio = new Audio(path);
        audio.preload = 'auto';
        sharedAudioRefs!.set(name as SoundName, audio);
      });
      audioInitialized = true;
    }
  }, []);

  const toggleSound = useCallback(() => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(STORAGE_KEY, String(soundEnabled));
    notifyListeners();
  }, []);

  const playSound = useCallback((name: SoundName) => {
    if (typeof window === 'undefined') return;

    // Check if sound is enabled - read directly from shared state
    if (!soundEnabled) return;

    // Prevent overlapping playback of the same sound
    if (playingState[name]) return;

    const audio = sharedAudioRefs?.get(name);
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
  }, []);

  return { playSound, isEnabled, toggleSound };
}
