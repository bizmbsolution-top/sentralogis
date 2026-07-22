'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function SpiralGalaxy({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);

  const count = 4000;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const coreBase = new THREE.Color('#6366F1');
    const arms = [
      { color: new THREE.Color('#818CF8'), offset: 0 },
      { color: new THREE.Color('#34D399'), offset: Math.PI },
      { color: new THREE.Color('#F472B6'), offset: Math.PI * 0.5 },
      { color: new THREE.Color('#38BDF8'), offset: Math.PI * 1.5 },
    ];

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const isCore = t < 0.12;
      const armIndex = Math.floor((i % 4));
      const arm = arms[armIndex % arms.length];

      const r = isCore
        ? 0.5 + Math.random() * 2.5
        : 2.5 + Math.pow(t, 1.8) * 18;

      const angle = isCore
        ? Math.random() * Math.PI * 2
        : r * 1.1 + arm.offset + (Math.random() - 0.5) * (0.3 + r * 0.03);

      const spreadY = isCore
        ? (Math.random() - 0.5) * 0.6
        : (Math.random() - 0.5) * (0.4 + r * 0.04);

      pos[i * 3] = r * Math.cos(angle);
      pos[i * 3 + 1] = spreadY;
      pos[i * 3 + 2] = r * Math.sin(angle);

      if (isCore) {
        const c = coreBase.clone().lerp(new THREE.Color('#A78BFA'), Math.random());
        col[i * 3] = c.r * (0.6 + Math.random() * 0.4);
        col[i * 3 + 1] = c.g * (0.6 + Math.random() * 0.4);
        col[i * 3 + 2] = c.b * (0.6 + Math.random() * 0.4);
      } else {
        const brightness = 0.4 + (1 - t) * 0.3;
        const c = arm.color.clone().multiplyScalar(brightness);
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);

  const origPos = useMemo(() => new Float32Array(geometry.attributes.position.array as Float32Array), [geometry]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.04;

    const mx = (mouse.current.x / window.innerWidth) * 2 - 1;
    const my = -(mouse.current.y / window.innerHeight) * 2 + 1;
    groupRef.current.rotation.x += (my * 0.06 - groupRef.current.rotation.x) * delta * 1.5;
    groupRef.current.rotation.z += (mx * 0.03 - groupRef.current.rotation.z) * delta * 1.5;

    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        pos[i3] += (origPos[i3] - pos[i3]) * 0.008;
        pos[i3 + 1] += (origPos[i3 + 1] - pos[i3 + 1]) * 0.008;
        pos[i3 + 2] += (origPos[i3 + 2] - pos[i3 + 2]) * 0.008;
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <primitive object={geometry} />
        <pointsMaterial
          size={0.05}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export default function EnterpriseGalaxy() {
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('touchmove', handleTouch);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Dark gradient overlay — ensures text readability */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#030712]/60 via-[#030712]/30 to-[#030712]/80" />
      <Canvas
        camera={{ position: [0, 5, 14], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SpiralGalaxy mouse={mouseRef} />
      </Canvas>
    </div>
  );
}
