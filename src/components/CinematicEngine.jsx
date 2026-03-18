import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

/*
 * SPECTRAL ACCRETION FIELD
 *
 * 18,000 particles in a single shared BufferGeometry.
 * No rings. No torus. No closed curves.
 * Particles are probability-seeded across 5 Gaussian energy bands.
 * Keplerian angular velocity: ω = 0.08 / √r
 * AdditiveBlending ensures overlap → luminance intensification.
 *
 * A custom ShaderMaterial handles:
 *   - per-particle opacity shimmer (via vertex attribute)
 *   - soft circular point shape (discard hard edges)
 *   - additive compositing
 */
const SpectralAccretionField = () => {
  const pointsRef = useRef();
  const COUNT = 22000;

  // Pre-computed orbital state
  const { geometry, phases, speeds, radii, seeds } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const ph  = new Float32Array(COUNT);
    const sp  = new Float32Array(COUNT);
    const rd  = new Float32Array(COUNT);
    const sd  = new Float32Array(COUNT); // per-particle random seed for shimmer

    // Gaussian energy bands — these are probability peaks, not boundaries
    const bands = [3.5, 5.5, 8.5, 12.0, 16.0];

    for (let i = 0; i < COUNT; i++) {
      // Select band as probability peak
      const band = bands[i % bands.length];

      // Gaussian jitter via central limit theorem (sum of 4 uniforms)
      // Reduced from 1.6 to 1.0 for tighter band cohesion while still allowing overlap
      const g = (Math.random() + Math.random() + Math.random() + Math.random() - 2.0) * 1.0;
      const radius = Math.max(1.5, band + g); // floor at 1.5 to avoid core collision

      const angle = Math.random() * Math.PI * 2;

      // Disk height — very thin for clear orbital structure
      const diskHeight = (Math.random() - 0.5) * 0.08;

      pos[i * 3]     = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = diskHeight;

      ph[i] = angle;
      // Keplerian: ω = base / √r at medium pace
      sp[i] = 0.15 / Math.sqrt(radius);
      rd[i] = radius;
      sd[i] = Math.random(); // shimmer phase offset
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    return { geometry: geo, phases: ph, speeds: sp, radii: rd, seeds: sd };
  }, []);

  // Custom shader for soft circular points with constant glow
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uBaseOpacity: { value: 0.35 }
    },
    vertexShader: `
      varying float vRadialFade;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        // Distance from center for radial brightness falloff
        float r = length(position.xy);
        vRadialFade = smoothstep(18.0, 5.0, r) * 0.6 + 0.4;

        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = 2.0;
      }
    `,
    fragmentShader: `
      uniform float uBaseOpacity;
      varying float vRadialFade;

      void main() {
        // Soft circular point — discard corners
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;

        // Very smooth Gaussian-like falloff for consistent glow
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha = pow(alpha, 1.5);

        gl_FragColor = vec4(1.0, 1.0, 1.0, uBaseOpacity * alpha * vRadialFade);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  }), []);

  // ✅ MEMORY LEAK FIX: Cleanup Three.js resources
  useEffect(() => {
    return () => {
      if (geometry) {
        geometry.dispose();
        console.log('🧹 Cleanup: Spectral Geometry disposed');
      }
      if (material) {
        material.dispose();
        console.log('🧹 Cleanup: Spectral Material disposed');
      }
    };
  }, [geometry, material]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const t = state.clock.getElapsedTime() * 0.75; // Global time scalar for medium motion
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array;

    for (let i = 0; i < COUNT; i++) {
      const angle = phases[i] + t * speeds[i];
      const r = radii[i];

      // Very subtle radial drift for organic feel without jitter
      const drift = Math.sin(t * 0.2 + seeds[i] * 6.28) * 0.02;

      arr[i * 3]     = Math.cos(angle) * (r + drift);
      arr[i * 3 + 1] = Math.sin(angle) * (r + drift);
      // Z stays as initialized — disk height is structural
    }
    posAttr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
};

/*
 * DEEP VOID — INERTIAL BACKGROUND FRAME
 *
 * 900 sub-pixel depth cues. Not a skybox. Not decoration.
 * Rotates on Y-axis (separate inertial frame from the accretion disk on Z).
 * 1px, opacity 0.15. Barely perceptible.
 */
const DeepVoid = () => {
  const ref = useRef();
  const COUNT = 900;

  const positions = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 140;
      p[i * 3 + 1] = (Math.random() - 0.5) * 140;
      p[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    return p;
  }, []);

  // ✅ MEMORY LEAK FIX: Cleanup Three.js resources
  useEffect(() => {
    return () => {
      if (ref.current) {
        if (ref.current.geometry) {
          ref.current.geometry.dispose();
          console.log('🧹 Cleanup: DeepVoid Geometry disposed');
        }
        if (ref.current.material) {
          ref.current.material.dispose();
          console.log('🧹 Cleanup: DeepVoid Material disposed');
        }
      }
    };
  }, []);

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.00012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={1.0}
        sizeAttenuation={false}
        color="#ffffff"
        transparent
        opacity={0.15}
      />
    </points>
  );
};

/*
 * SINGULARITY CORE — VOLUMETRIC ONLY
 *
 * No spikes. No rays. No planes. No sprite flares.
 * Only density and bloom.
 *
 *   Layer 0: White collapse point (r: 0.04)
 *   Layer 1: Cyan energy atmosphere (soft, large)
 *   Layer 2: Violet diffusion halo (very low intensity, extends into field)
 *   Light:   PointLight to illuminate nearby dust
 */
const SingularityCore = () => (
  <group>
    {/* Collapse point */}
    <mesh>
      <sphereGeometry args={[0.04, 32, 32]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>

    {/* Primary energy atmosphere — cyan */}
    <mesh>
      <sphereGeometry args={[0.7, 32, 32]} />
      <meshBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.06}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>

    {/* Secondary diffusion halo — violet, extends into particle field */}
    <mesh>
      <sphereGeometry args={[2.0, 32, 32]} />
      <meshBasicMaterial
        color="#7c3aed"
        transparent
        opacity={0.02}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>

    {/* Volumetric illumination source */}
    <pointLight intensity={4} distance={20} decay={2.5} color="#e0f2fe" />
  </group>
);

/*
 * CINEMATIC ENGINE — MASTER ASSEMBLY
 *
 * Fixed environmental backdrop. Never scrolls. Never reacts.
 * Central 22% is absolute black (text protection field).
 * 78° perspective tilt for gravitational recession.
 */
export default function CinematicEngine() {
  return (
    <div
      className="fixed inset-0 z-[-50] bg-[#010204] pointer-events-none"
      style={{
        maskImage: 'radial-gradient(circle at 50% 50%, transparent 22%, black 54%)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, transparent 22%, black 54%)'
      }}
    >
      <Canvas
        camera={{ position: [0, 4, 15], fov: 38 }}
        gl={{
          powerPreference: 'high-performance',
          antialias: false,
          toneMapping: THREE.NoToneMapping
        }}
        dpr={[1, 1.5]}
      >
        <fogExp2 attach="fog" args={['#010204', 0.025]} />

        {/* Separate inertial frame — Y-axis rotation */}
        <DeepVoid />

        {/* Gravitational perspective: 78° tilt */}
        <group rotation={[-Math.PI * 0.43, 0, 0]}>
          <SingularityCore />
          <SpectralAccretionField />
        </group>

        <EffectComposer disableNormalPass>
          <Bloom
            luminanceThreshold={0.85}
            intensity={2.5}
            mipmapBlur
            radius={0.85}
          />
          <Noise opacity={0.04} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
