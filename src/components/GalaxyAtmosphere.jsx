import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- Shaders & Materials ---

// 1. Star Field Shader (Twinkle + Void Mask)
const StarShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffffff') },
    uVoidRadius: { value: 4.0 }, // Radius of the central void
  },
  vertexShader: `
    uniform float uTime;
    attribute float size;
    attribute float weirdness; // Random offset for twinkle
    varying float vAlpha;
    varying vec3 vPos;

    void main() {
      vPos = position;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      
      // Twinkle effect: vary size/opacity based on time and random attribute
      float twinkle = sin(uTime * 2.0 + weirdness * 10.0) * 0.5 + 0.5;
      
      gl_PointSize = size * (1.0 + twinkle * 0.5) * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      // Distance from center for the Void Mask
      float dist = length(position.xy);
      
      // Calculate alpha: 0 in center, fading in (VOID MASK)
      // Smoothstep from 2.0 to 7.0 radius to clear the center
      vAlpha = smoothstep(2.0, 7.0, dist); 
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;
    varying vec3 vPos;

    void main() {
      // Circular particle
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;
      
      // Soft edge
      float glow = 1.0 - (dist * 2.0);
      glow = pow(glow, 1.5);

      gl_FragColor = vec4(uColor, vAlpha * glow);
    }
  `
};

// 2. Dusty Ring Shader (Noise Texture + Void Mask)
const RingFlowShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#818cf8') },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;

    // Pseudo-random noise
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      // Create a flowing texture along the ring
      // vUv.x is around the ring (0-1), vUv.y is width (0-1)
      
      // Noise flow
      float n = noise(vec2(vUv.x * 20.0 + uTime * 0.5, vUv.y * 5.0));
      
      // Beam intensity (fade edges on Y axis)
      float beam = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
      
      // Grainy dust look
      float grain = random(vUv * 100.0 + uTime);
      
      float alpha = beam * (n * 0.6 + 0.4) * grain;
      
      // Add slight color variation
      vec3 finalColor = mix(uColor, vec3(1.0), grain * 0.2);

      gl_FragColor = vec4(finalColor, alpha * 0.4); 
    }
  `
};

// --- Components ---

const CinematicStars = ({ count = 6000 }) => {
  const points = useRef();
  
  // Custom Shader Material ref
  const shaderMaterial = useRef();

  const [positions, sizes, weirdness] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const weirdness = new Float32Array(count); // Individual offsets

    for (let i = 0; i < count; i++) {
        // Spherical distribution but flattened slightly
        const r = 4 + Math.random() * 30; // Min radius 4 to respect void - starting further out
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        
        // Flatten y
        const yBias = 0.2; 
        
        positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = (r * Math.sin(phi) * Math.sin(theta)) * yBias; 
        positions[i*3+2] = r * Math.cos(phi);

        sizes[i] = Math.random() * 2.0;
        weirdness[i] = Math.random();
    }
    return [positions, sizes, weirdness];
  }, [count]);

  useFrame((state) => {
      if (shaderMaterial.current) {
          shaderMaterial.current.uniforms.uTime.value = state.clock.getElapsedTime();
      }
      // Slow drift
      if (points.current) {
         points.current.rotation.y = state.clock.getElapsedTime() * 0.005;
      }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-size" count={count} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-weirdness" count={count} array={weirdness} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderMaterial}
        attach="material"
        uniforms={StarShaderMaterial.uniforms}
        vertexShader={StarShaderMaterial.vertexShader}
        fragmentShader={StarShaderMaterial.fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const DustyRing = ({ radius, width, color, speed, tiltX = 0, tiltZ = 0 }) => {
    const mesh = useRef();
    const material = useRef();

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (mesh.current) {
            // Gyroscopic rotation
            mesh.current.rotation.z = time * speed * 0.05 + tiltZ;
        }
        if (material.current) {
            material.current.uniforms.uTime.value = time;
        }
    });

    return (
        <mesh ref={mesh} rotation={[tiltX, 0, 0]}>
            <ringGeometry args={[radius, radius + width, 128, 1]} />
            <shaderMaterial
                ref={material}
                attach="material"
                uniforms={{
                    uTime: { value: 0 },
                    uColor: { value: new THREE.Color(color) }
                }}
                vertexShader={RingFlowShader.vertexShader}
                fragmentShader={RingFlowShader.fragmentShader}
                transparent
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
}

const CameraRig = () => {
    const { camera, mouse } = useThree();
    const vec = new THREE.Vector3();

    useFrame((state) => {
        // Zero-Lag Camera: Smooth Lerp to mouse position
        // Target position based on mouse (small parallax)
        const targetX = state.mouse.x * 2;
        const targetY = state.mouse.y * 1;

        // Smoothly interpolate current camera position to target
        // Factor 0.05 gives that "heavy" inertia feel
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.y += (targetY - camera.position.y) * 0.05;
        
        // Always look at center
        camera.lookAt(0, 0, 0);
    });
    return null;
}

const SceneContent = () => {
    return (
        <>
            <color attach="background" args={['#020204']} /> {/* Deepest Charcoal/Black */}
            <fog attach="fog" args={['#020204', 10, 40]} />
            
            <CameraRig />

            <group rotation={[THREE.MathUtils.degToRad(70), 0, 0]}> {/* 70 Degree Tilt */}
                <CinematicStars count={6000} />
                
                {/* 5 Concentric "Dust & Light" Rings with Prime Number Speeds */}
                {/* Prime speeds ensure non-repeating pattern */}
                <DustyRing radius={4.5} width={0.1} color="#6366f1" speed={0.4} tiltZ={0.2} /> {/* 1 */}
                <DustyRing radius={6.0} width={0.3} color="#818cf8" speed={-0.3} tiltZ={-0.1} /> {/* 2 */}
                <DustyRing radius={8.2} width={0.05} color="#c7d2fe" speed={0.6} tiltZ={0.4} /> {/* 3 */}
                <DustyRing radius={11.0} width={0.6} color="#4338ca" speed={-0.2} tiltZ={0.1} /> {/* 4 */}
                <DustyRing radius={15.0} width={0.1} color="#312e81" speed={0.1} tiltZ={-0.3} /> {/* 5 */}
            </group>

            {/* Central "Core" Glow - Soft diffused heat signature BEHIND everything */}
            <pointLight position={[0, 0, -5]} intensity={2.0} color="#4338ca" distance={20} decay={2} />
            <ambientLight intensity={0.5} />

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.2} mipmapBlur intensity={0.8} radius={0.4} />
                <Noise opacity={0.05} premultiply />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>
        </>
    );
};

const GalaxyAtmosphere = () => {
    return (
    <div className="fixed inset-0 w-full h-full z-[-10] bg-[#020204]">
        <Canvas
            camera={{ position: [0, 0, 18], fov: 35 }} // Narrower FOV for cinematic look
            dpr={[1, 1.5]} // Cap DPR for performance
            gl={{ antialias: false, alpha: false, stencil: false, depth: true }}
        >
            <SceneContent />
        </Canvas>
    </div>
  );
};

export default GalaxyAtmosphere;