import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

const StarField = () => {
    const points = useRef();

    // Generate exactly 800 vertices for a sharp, tactical star map
    const particles = useMemo(() => {
        const temp = new Float32Array(800 * 3);
        const distance = 80; 
        
        for (let i = 0; i < 800; i++) {
            const theta = THREE.MathUtils.randFloatSpread(360); 
            const phi = THREE.MathUtils.randFloatSpread(360); 

            // Spread stars far out to create depth without clustering
            const x = distance * Math.sin(theta) * Math.cos(phi);
            const y = distance * Math.sin(theta) * Math.sin(phi);
            const z = distance * Math.cos(theta);

            temp[i * 3] = x;
            temp[i * 3 + 1] = y;
            temp[i * 3 + 2] = z;
        }
        return temp;
    }, []);

    useFrame((state) => {
        // Imperceptible continuous rotation
        if (points.current) {
            points.current.rotation.y += 0.0005;
        }
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particles.length / 3}
                    array={particles}
                    itemSize={3}
                />
            </bufferGeometry>
            {/* Razor-sharp, non-scaling points */}
            <pointsMaterial
                size={0.05} 
                sizeAttenuation={true} 
                transparent={true}
                opacity={0.6}
                color="#ffffff"
            />
        </points>
    );
};

// Razor-sharp concentric rings with no noise shader
const TacticalRing = ({ radius, speed, opacity }) => {
    const ringRef = useRef();
    
    useFrame(() => {
        if (ringRef.current) {
            ringRef.current.rotation.z += speed;
        }
    });

    return (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius, radius + 0.05, 128]} />
            <meshBasicMaterial 
                color="#ffffff" 
                transparent={true} 
                opacity={opacity} 
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </mesh>
    );
};

const AnamorphicFlare = () => {
    return (
        <mesh scale={[0.04, 20, 1]} position={[0,0,-2]}>
             <planeGeometry args={[1, 1]} />
             <meshBasicMaterial 
                color="#a5b4fc" 
                transparent 
                opacity={0.15}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </mesh>
    );
};

const SceneContent = () => {    
    useFrame((state) => {
        // Heavy industrial crane movement
        // Lerp camera position based on mouse with heavy friction
        const damp = 0.02;
        const targetX = state.pointer.x * 2; // subtle range
        const targetY = state.pointer.y * 1;

        if (state.camera) {
            state.camera.position.x += (targetX - state.camera.position.x) * damp;
            state.camera.position.y += (targetY - state.camera.position.y) * damp;
            state.camera.lookAt(0, 0, 0);
        }
    });

    return (
        <>
            <color attach="background" args={['#030407']} />
            
            <group rotation={[THREE.MathUtils.degToRad(75), 0, 0]}>
                <StarField />
                
                {/* 5 Concentric Rings - Prime number speeds */}
                {/* Thin, precise, no noise */}
                <group>
                    <TacticalRing radius={4} speed={0.002} opacity={0.3} />
                    <TacticalRing radius={6} speed={-0.0015} opacity={0.25} />
                    <TacticalRing radius={9} speed={0.003} opacity={0.2} />
                    <TacticalRing radius={13} speed={-0.001} opacity={0.15} />
                    <TacticalRing radius={18} speed={0.0005} opacity={0.1} />
                </group>

                <pointLight position={[0, 0, 0]} intensity={4} distance={20} decay={2} color="#6366f1" />
            </group>
            
            {/* The Singularity - Bright white core */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.04, 32, 32]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            
            {/* Vertical Flare grounded to the singularity */}
            <AnamorphicFlare />

            {/* Aggressively clamped post-processing */}
            <EffectComposer disableNormalPass>
                <Bloom 
                    luminanceThreshold={0.2} 
                    intensity={0.8} 
                    mipmapBlur={true} 
                    radius={0.4}
                />
                <Noise opacity={0.05} /> 
            </EffectComposer>
        </>
    );
};

const TriageEngine = () => {
    return (
        <div 
            className="fixed inset-0 w-full h-full z-[-10] bg-[#030407]"
            style={{ 
                // CRITICAL FAIL CONDITION 3 & 1: Force physical mask via CSS
                maskImage: 'radial-gradient(circle at center, transparent 30%, black 80%)', 
                WebkitMaskImage: 'radial-gradient(circle at center, transparent 30%, black 80%)' 
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 16], fov: 40 }}
                dpr={[1, 1.5]}
                gl={{ 
                    antialias: false, // sharper lines
                    alpha: false,
                    toneMapping: THREE.NoToneMapping,
                }}
            >
                <SceneContent />
            </Canvas>
        </div>
    );
};

export default TriageEngine;
