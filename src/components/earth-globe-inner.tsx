'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getCetusCycleState, syncCetusCycle } from '@/lib/cetus-cycle';
import { getReduceMotionEnabled } from '@/hooks/use-reduce-motion';

// Log immediately when module loads
console.log('[EarthInner] Module loaded');

const GLOBE_RADIUS = 100;
const MODEL_SCALE = 2;

interface EarthGlobeInnerProps {
  onLoadSuccess?: () => void;
  onLoadError?: (error: string) => void;
  onLoadProgress?: (percent: number) => void;
}

export default function EarthGlobeInner({
  onLoadSuccess,
  onLoadError,
  onLoadProgress,
}: EarthGlobeInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number | null;
  } | null>(null);

  console.log('[EarthInner] Component rendering');

  useEffect(() => {
    console.log('[EarthInner] useEffect running');

    if (!containerRef.current) {
      console.error('[EarthInner] containerRef is null!');
      return;
    }

    const container = containerRef.current;
    console.log('[EarthInner] Container found, setting up scene');

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 300);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    scene.add(sunLight);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      animationId: null,
    };

    // Earth group
    const earthGroup = new THREE.Group();
    const scaledRadius = GLOBE_RADIUS * MODEL_SCALE;
    earthGroup.position.set(0, -scaledRadius * 1.3, 0);
    scene.add(earthGroup);

    const earthMaterials: THREE.MeshStandardMaterial[] = [];

    // Load model
    const loader = new GLTFLoader();
    const modelUrl = '/earth.glb';

    console.log('[EarthInner] Starting GLB load from:', modelUrl);
    console.log('[EarthInner] Current URL:', window.location.href);

    loader.load(
      modelUrl,
      (gltf) => {
        if (!sceneRef.current) return;

        console.log('[EarthInner] GLB loaded successfully!');

        const earth = gltf.scene;
        earth.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            earthMaterials.push(mat);
          }
        });

        earth.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        earthGroup.add(earth);

        onLoadSuccess?.();
      },
      (progress) => {
        if (progress.lengthComputable) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`[EarthInner] Progress: ${percent}%`);
          onLoadProgress?.(percent);
        } else {
          console.log(`[EarthInner] Loading... ${progress.loaded} bytes`);
        }
      },
      (error) => {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[EarthInner] GLB load FAILED:', errorMsg);
        onLoadError?.(errorMsg);
      }
    );

    // Sync cycle
    syncCetusCycle().then((source) => {
      console.log('[EarthInner] Cycle synced from:', source);
    });

    let lastIsDay: boolean | null = null;
    let lastEmissiveIntensity: number | null = null;

    // Simple check: if screen width <= 1440px, disable spinning and throttle rendering
    const isSmallScreen = window.innerWidth <= 1440;
    const reduceMotion = getReduceMotionEnabled();
    console.log('[EarthInner] Screen width:', window.innerWidth, '| Small screen mode:', isSmallScreen, '| Reduce motion:', reduceMotion);

    // On small screens: render once per second instead of 60fps
    // On large screens: full 60fps animation with globe spin
    let animationId: number | null = null;

    const renderFrame = () => {
      const state = getCetusCycleState();

      // Only spin the globe on large screens and when reduce motion is off
      if (!isSmallScreen && !reduceMotion) {
        earthGroup.rotation.y += 0.0005;
      }

      const progress = state.percentComplete / 100;
      let sunAngle: number;
      if (state.isDay) {
        sunAngle = progress * Math.PI;
      } else {
        sunAngle = (1 - progress) * Math.PI;
      }

      sunLight.position.set(
        Math.sin(sunAngle) * 400,
        100,
        Math.cos(sunAngle) * 400
      );

      const darkness = sunAngle / Math.PI;
      const newEmissiveIntensity = darkness * 2;

      // Only update materials when emissive intensity changes by >0.01
      if (lastEmissiveIntensity === null || Math.abs(newEmissiveIntensity - lastEmissiveIntensity) > 0.01) {
        lastEmissiveIntensity = newEmissiveIntensity;
        earthMaterials.forEach((mat) => {
          if (mat.emissiveMap) {
            mat.emissiveIntensity = newEmissiveIntensity;
            mat.emissive.setHex(0xffcc66);
          }
        });
      }

      if (lastIsDay !== state.isDay) {
        console.log(`[EarthInner] ${state.isDay ? 'DAY' : 'NIGHT'} started`);
        lastIsDay = state.isDay;
      }

      renderer.render(scene, camera);
    };

    if (isSmallScreen) {
      // Small screen: render once immediately, then update every second
      renderFrame();
      const intervalId = setInterval(renderFrame, 1000);
      sceneRef.current.animationId = intervalId as unknown as number;
    } else {
      // Large screen: 30fps animation loop (skip every other frame)
      let frameCount = 0;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        frameCount++;
        if (frameCount % 2 === 0) {
          renderFrame();
        }
      };
      animate();
    }

    // Resize handler
    const handleResize = () => {
      if (!sceneRef.current || !container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isSmallScreen && sceneRef.current?.animationId) {
        clearInterval(sceneRef.current.animationId);
      } else if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current = null;
      }
    };
  }, [onLoadSuccess, onLoadError, onLoadProgress]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  );
}
