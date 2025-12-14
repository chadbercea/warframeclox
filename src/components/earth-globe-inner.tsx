'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getCetusCycleState, syncCetusCycle } from '@/lib/cetus-cycle';

const GLOBE_RADIUS = 100;
const MODEL_SCALE = 2; // 2x larger as requested

type LoadingState = 'loading' | 'success' | 'error';

export default function EarthGlobeInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number | null;
  } | null>(null);

  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

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

    // Earth group positioned at bottom - scaled radius accounts for 2x size
    // Position so top of globe is at bottom 20% of viewport
    const earthGroup = new THREE.Group();
    const scaledRadius = GLOBE_RADIUS * MODEL_SCALE;
    // Push down so only top portion is visible, top at ~20% from bottom
    earthGroup.position.set(0, -scaledRadius * 1.3, 0);
    scene.add(earthGroup);

    const earthMaterials: THREE.MeshStandardMaterial[] = [];

    // Load model with progress tracking
    const loader = new GLTFLoader();
    const modelUrl = '/earth.glb';

    console.log('[Earth] Starting to load model from:', modelUrl);
    console.log('[Earth] Window location:', window.location.href);

    loader.load(
      modelUrl,
      (gltf) => {
        if (!sceneRef.current) return;

        console.log('[Earth] SUCCESS - Model loaded successfully!');
        console.log('[Earth] Model details:', {
          animations: gltf.animations.length,
          scenes: gltf.scenes.length,
        });

        const earth = gltf.scene;
        earth.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            earthMaterials.push(mat);
          }
        });

        earth.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        earthGroup.add(earth);
        setLoadingState('success');
      },
      (progress) => {
        // Progress callback
        if (progress.lengthComputable) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadProgress(percent);
          console.log(`[Earth] Loading progress: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
        } else {
          console.log(`[Earth] Loading... ${progress.loaded} bytes loaded`);
          setLoadProgress(-1); // Indeterminate
        }
      },
      (error) => {
        console.error('[Earth] ERROR - Failed to load GLB:', error);
        console.error('[Earth] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          url: modelUrl,
        });
        setLoadingState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load 3D model');
      }
    );

    // Sync cycle
    syncCetusCycle().then((source) => {
      console.log('[Earth] Cycle synced from:', source);
    });

    let lastIsDay: boolean | null = null;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const state = getCetusCycleState();

      // Slow rotation for visual interest (independent of lighting)
      earthGroup.rotation.y += 0.0005;

      // Continuous light transition synced to clock percentage
      // Day: 0% = lit, 100% = dark (transitioning toward night)
      // Night: 0% = dark, 100% = lit (transitioning toward day)
      const progress = state.percentComplete / 100;

      let sunAngle: number;
      if (state.isDay) {
        // Day: start lit (0), end dark (PI)
        sunAngle = progress * Math.PI;
      } else {
        // Night: start dark (PI), end lit (0)
        sunAngle = (1 - progress) * Math.PI;
      }

      sunLight.position.set(
        Math.sin(sunAngle) * 400,
        100,
        Math.cos(sunAngle) * 400
      );

      // City lights intensity matches darkness (sunAngle / PI gives 0-1)
      const darkness = sunAngle / Math.PI;
      earthMaterials.forEach((mat) => {
        if (mat.emissiveMap) {
          mat.emissiveIntensity = darkness * 2;
          mat.emissive.setHex(0xffcc66);
        }
      });

      // Log transitions
      if (lastIsDay !== state.isDay) {
        console.log(`[Earth] ${state.isDay ? 'DAY' : 'NIGHT'} started`);
        lastIsDay = state.isDay;
      }

      renderer.render(scene, camera);
    };

    animate();

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
      if (sceneRef.current) {
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="fixed bottom-0 left-0 right-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100vh',
          zIndex: 0,
        }}
      />

      {/* Orokin Loading Indicator */}
      {loadingState !== 'success' && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50"
          style={{ pointerEvents: 'none' }}
        >
          {loadingState === 'loading' && (
            <>
              {/* Orokin spinner - rotating segments */}
              <div className="relative w-16 h-16">
                {/* Outer ring */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-amber-500/30"
                  style={{
                    boxShadow: '0 0 10px rgba(217, 164, 65, 0.3), inset 0 0 10px rgba(217, 164, 65, 0.1)',
                  }}
                />
                {/* Rotating segments */}
                <div
                  className="absolute inset-0 animate-spin"
                  style={{ animationDuration: '2s' }}
                >
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                </div>
                {/* Inner rotating ring */}
                <div
                  className="absolute inset-3 rounded-full border border-amber-400/50 animate-spin"
                  style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                />
                {/* Center dot */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div
                    className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"
                    style={{ boxShadow: '0 0 12px rgba(217, 164, 65, 1)' }}
                  />
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-32 h-1 bg-amber-900/50 rounded-full overflow-hidden">
                {loadProgress >= 0 ? (
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                    style={{
                      width: `${loadProgress}%`,
                      boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)',
                    }}
                  />
                ) : (
                  <div
                    className="h-full w-1/3 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse"
                    style={{
                      animation: 'indeterminate 1.5s ease-in-out infinite',
                    }}
                  />
                )}
              </div>

              {/* Loading text */}
              <div
                className="text-amber-400/80 text-xs font-mono tracking-wider"
                style={{ textShadow: '0 0 8px rgba(217, 164, 65, 0.5)' }}
              >
                {loadProgress >= 0 ? `LOADING EARTH... ${loadProgress}%` : 'LOADING EARTH...'}
              </div>
            </>
          )}

          {loadingState === 'error' && (
            <div className="flex flex-col items-center gap-2 p-4 bg-red-950/80 border border-red-500/50 rounded">
              {/* Error icon */}
              <div
                className="w-12 h-12 rounded-full border-2 border-red-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)' }}
              >
                <span className="text-red-500 text-2xl font-bold">!</span>
              </div>
              <div className="text-red-400 text-xs font-mono tracking-wider text-center">
                FAILED TO LOAD 3D MODEL
              </div>
              <div className="text-red-300/70 text-xs font-mono text-center max-w-48">
                {errorMessage}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS for indeterminate animation */}
      <style jsx>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </>
  );
}
