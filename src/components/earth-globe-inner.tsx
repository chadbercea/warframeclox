'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { getCetusCycleState, syncCetusCycle } from '@/lib/cetus-cycle';

const GLOBE_RADIUS = 100;
const MODEL_SCALE = 2; // 2x larger as requested

export default function EarthGlobeInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number | null;
  } | null>(null);

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

    // Load model
    const loader = new GLTFLoader();
    loader.load(
      '/earth.glb',
      (gltf) => {
        if (!sceneRef.current) return;

        const earth = gltf.scene;
        earth.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshStandardMaterial;
            earthMaterials.push(mat);
          }
        });

        earth.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        earthGroup.add(earth);
        console.log('[Earth] Model loaded');
      },
      undefined,
      (error) => {
        console.error('[Earth] Error loading GLB:', error);
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
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100vh',
        zIndex: 0,
      }}
    />
  );
}
