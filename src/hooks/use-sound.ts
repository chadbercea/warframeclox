'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

// Sound file paths
const SOUNDS = {
  cycleTransition: '/warframe-sounds/CetInvasionOfferingReady.ogg',
  menuOpen: '/warframe-sounds/MenuDeployDrone.ogg',
  menuClose: '/warframe-sounds/MenuRetrieveDrone.ogg',
} as const;

export type SoundName = keyof typeof SOUNDS;

// Track playing state per sound to prevent overlapping
const playingState: Record<string, boolean> = {};

const STORAGE_KEY = 'warframeclox_sound_enabled';

// Shared audio elements across all hook instances
let sharedAudioRefs: Map<SoundName, HTMLAudioElement> | null = null;
let audioInitialized = false;

// Shared state management for sound enabled across all hook instances
let soundEnabled = false; // Default to false - MUST be opt-in
let storageInitialized = false; // Track if we've read from localStorage
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  // Ensure we've read from localStorage before returning state
  ensureStorageInitialized();
  return soundEnabled;
}

function getServerSnapshot() {
  return false; // Default for SSR - always false
}

function ensureStorageInitialized() {
  if (typeof window === 'undefined') return;
  if (storageInitialized) return;
  storageInitialized = true;
  
  const savedPreference = localStorage.getItem(STORAGE_KEY);
  // ONLY set to true if explicitly saved as 'true'
  // null, undefined, 'false', or any other value = false
  soundEnabled = savedPreference === 'true';
  console.log('[Sound] Initialized from storage:', { savedPreference, soundEnabled });
}

// Initialize audio elements immediately when module loads (client-side only)
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
  // Use useSyncExternalStore for shared state across all hook instances
  const isEnabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Initialize audio on first mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure storage is initialized and notify listeners
    ensureStorageInitialized();
    notifyListeners();

    // Initialize audio elements
    initializeAudio();
  }, []);

  const toggleSound = useCallback(() => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(STORAGE_KEY, String(soundEnabled));
    notifyListeners();
  }, []);

  const playSound = useCallback((name: SoundName) => {
    if (typeof window === 'undefined') return;

    // Ensure storage is initialized before checking state
    ensureStorageInitialized();

    // Check if sound is enabled - read directly from shared state
    if (!soundEnabled) {
      console.log(`[Sound] Sound disabled, not playing ${name}`);
      return;
    }

    // Ensure audio is initialized
    initializeAudio();

    // Prevent overlapping playback of the same sound
    if (playingState[name]) {
      console.log(`[Sound] Already playing ${name}, skipping`);
      return;
    }

    const audio = sharedAudioRefs?.get(name);
    if (!audio) {
      console.log(`[Sound] No audio element for ${name}`);
      return;
    }

    console.log(`[Sound] Playing ${name}`);

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
