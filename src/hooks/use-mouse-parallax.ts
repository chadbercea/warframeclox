'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ParallaxTransform {
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
  translateZ: number;
}

export interface LayeredParallax {
  // Background geometry - furthest back, slowest movement
  background: ParallaxTransform;
  // Clock circles/tracks - middle layer
  circles: ParallaxTransform;
  // Text/labels - closest to viewer, fastest movement
  text: ParallaxTransform;
}

const MAX_ROTATION = 20; // degrees - heavy tilt
const MAX_SLIDE = 40; // pixels - how much layers slide toward mouse (increased for visibility)

// Layer slide multipliers - front layers slide MORE toward mouse
// This creates the "leaning in" effect where closer elements reach toward cursor
const SLIDE_MULTIPLIERS = {
  background: 0.4,  // Furthest back - subtle slide
  circles: 0.7,     // Middle layer - moderate slide
  text: 1.2,        // Front layer - reaches most toward mouse (overshoots slightly)
};

// Rotation multipliers - all layers rotate together but at different intensities
const ROTATION_MULTIPLIERS = {
  background: 0.4,
  circles: 0.7,
  text: 1.0,
};

// Z-axis depth for 3D separation
const Z_DEPTHS = {
  background: -50,  // Push back
  circles: 0,       // Middle
  text: 30,         // Pull forward
};

export function useMouseParallax(): LayeredParallax {
  const [layers, setLayers] = useState<LayeredParallax>({
    background: { rotateX: 0, rotateY: 0, translateX: 0, translateY: 0, translateZ: Z_DEPTHS.background },
    circles: { rotateX: 0, rotateY: 0, translateX: 0, translateY: 0, translateZ: Z_DEPTHS.circles },
    text: { rotateX: 0, rotateY: 0, translateX: 0, translateY: 0, translateZ: Z_DEPTHS.text },
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;

    // Calculate mouse position as percentage from center (-1 to 1)
    const xPercent = (clientX / innerWidth - 0.5) * 2;
    const yPercent = (clientY / innerHeight - 0.5) * 2;

    // Base rotation - tilt toward mouse
    const baseRotateY = xPercent * MAX_ROTATION;
    const baseRotateX = -yPercent * MAX_ROTATION;

    // Base slide - positive values slide TOWARD the mouse
    // Front layers slide more, creating depth separation
    const baseSlideX = xPercent * MAX_SLIDE;
    const baseSlideY = yPercent * MAX_SLIDE;

    setLayers({
      background: {
        rotateX: baseRotateX * ROTATION_MULTIPLIERS.background,
        rotateY: baseRotateY * ROTATION_MULTIPLIERS.background,
        translateX: baseSlideX * SLIDE_MULTIPLIERS.background,
        translateY: baseSlideY * SLIDE_MULTIPLIERS.background,
        translateZ: Z_DEPTHS.background,
      },
      circles: {
        rotateX: baseRotateX * ROTATION_MULTIPLIERS.circles,
        rotateY: baseRotateY * ROTATION_MULTIPLIERS.circles,
        translateX: baseSlideX * SLIDE_MULTIPLIERS.circles,
        translateY: baseSlideY * SLIDE_MULTIPLIERS.circles,
        translateZ: Z_DEPTHS.circles,
      },
      text: {
        rotateX: baseRotateX * ROTATION_MULTIPLIERS.text,
        rotateY: baseRotateY * ROTATION_MULTIPLIERS.text,
        translateX: baseSlideX * SLIDE_MULTIPLIERS.text,
        translateY: baseSlideY * SLIDE_MULTIPLIERS.text,
        translateZ: Z_DEPTHS.text,
      },
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return layers;
}
