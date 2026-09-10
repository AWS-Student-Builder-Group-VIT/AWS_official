import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion } from 'framer-motion';

// 1. PacManEntity Component
const PacManEntity = () => {
  const topHalfRef = useRef(null);
  const bottomHalfRef = useRef(null);

  // Chomping animation loop
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Mouth open/close angle (0 to PI/4)
    const angle = (Math.sin(t * 8) + 1) * 0.25; 
    if (topHalfRef.current && bottomHalfRef.current) {
      topHalfRef.current.rotation.z = angle;
      bottomHalfRef.current.rotation.z = -angle;
    }
  });

  return (
    <group rotation={[0, -Math.PI / 6, 0]}>
      {/* Top Hemisphere */}
      <mesh ref={topHalfRef}>
        {/* radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength */}
        <sphereGeometry args={[1.5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial 
          color="#ff9900" 
          emissive="#ff9900"
          emissiveIntensity={2}
          metalness={0.8}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
      
      {/* Bottom Hemisphere */}
      <mesh ref={bottomHalfRef}>
        <sphereGeometry args={[1.5, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhysicalMaterial 
          color="#ff9900" 
          emissive="#ff9900"
          emissiveIntensity={2}
          metalness={0.8}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

// 2. DataTrail Component
const DataTrail = () => {
  const nodeCount = 8;
  
  const nodes = useMemo(() => {
    return Array.from({ length: nodeCount }).map((_, i) => ({
      ref: React.createRef(),
      initialX: 5 + i * 3, // Space them out along the X axis
    }));
  }, [nodeCount]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = 8;

    nodes.forEach((node, i) => {
      if (node.ref.current) {
        // Move nodes towards Pac-Man (who is at x=0)
        let currentX = node.initialX - (t * speed) % (nodeCount * 3);
        
        // Loop nodes back once they are "eaten"
        if (currentX < 0) {
           currentX += (nodeCount * 3);
        }

        node.ref.current.position.x = currentX;
        
        // Slight bobbing effect and rotation to make them look like "data/cloud" fragments
        node.ref.current.position.y = Math.sin(t * 3 + i) * 0.2;
        node.ref.current.rotation.x = t + i;
        node.ref.current.rotation.y = t * 1.5 + i;
        
        // Scale down as they get closer to the mouth to simulate being eaten
        const scale = Math.min(1, currentX / 2);
        node.ref.current.scale.setScalar(Math.max(scale, 0.01));
      }
    });
  });

  return (
    <group>
      {nodes.map((node, i) => (
        <group key={i} ref={node.ref}>
          {/* Main Cyan Data Block */}
          <mesh>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshPhysicalMaterial 
              color="#04beff" 
              emissive="#04beff"
              emissiveIntensity={3}
              metalness={0.5}
              roughness={0.1}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
          {/* Inner bright core */}
          <mesh scale={0.5}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// 3. Scene Component
const Scene = () => {
  return (
    <>
      <color attach="background" args={['#1a120a']} />
      <fog attach="fog" args={['#1a120a', 5, 15]} />
      
      {/* Environment from drei for rich reflections on the metallic materials */}
      <Environment preset="city" />
      <PerspectiveCamera makeDefault position={[5, 2, 8]} fov={45} />

      <ambientLight intensity={0.5} color="#ffffff" />
      <spotLight position={[10, 10, 10]} intensity={3} color="#ff9900" penumbra={1} />
      <spotLight position={[-10, 10, 10]} intensity={2} color="#04beff" penumbra={1} />

      <group position={[-2, 0, -2]}>
        <PacManEntity />
        <DataTrail />
      </group>

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.1} 
          luminanceSmoothing={0.9} 
          height={300} 
          intensity={2}
        />
      </EffectComposer>
    </>
  );
};

// 4. Loader (Default Export)
const Loader = () => {
  return (
    <div className="fixed inset-0 z-50 bg-[#1a120a] bg-grid-pattern flex flex-col items-center justify-center overflow-hidden">
      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas>
          <Scene />
        </Canvas>
      </div>

      {/* 2D Typography Overlay using Framer Motion */}
      <motion.div 
        className="absolute bottom-16 z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <motion.h1 
          className="font-['Space_Mono'] text-[#04beff] uppercase tracking-widest text-xl md:text-2xl font-bold text-center"
          style={{ textShadow: '0 0 10px rgba(4, 190, 255, 0.8), 0 0 20px rgba(4, 190, 255, 0.4)' }}
          animate={{
            textShadow: [
              '0 0 10px rgba(4, 190, 255, 0.6), 0 0 20px rgba(4, 190, 255, 0.2)',
              '0 0 15px rgba(4, 190, 255, 1), 0 0 30px rgba(4, 190, 255, 0.6)',
              '0 0 10px rgba(4, 190, 255, 0.6), 0 0 20px rgba(4, 190, 255, 0.2)',
            ],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Initiating Cloud Infrastructure...
        </motion.h1>
      </motion.div>
    </div>
  );
};

export default Loader;
