"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Category = "ring" | "necklace" | "earring" | "bracelet" | "cuff" | "default";

interface JewelryPlaceholder3DProps {
  category?: Category;
  interactive?: boolean;
  className?: string;
}

/* ─── Shared material ─── */
function useMetal() {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#888888"),
        metalness: 1.0,
        roughness: 0.15,
        envMapIntensity: 1.5,
      }),
    []
  );
}

/* ─── Ring ─── */
function RingModel() {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useMetal();
  useFrame(() => {
    ref.current.rotation.y += 0.004;
  });
  return (
    <mesh ref={ref} material={mat} rotation={[0.4, 0, 0]}>
      <torusGeometry args={[1, 0.35, 32, 100]} />
    </mesh>
  );
}

/* ─── Necklace ─── */
function NecklaceModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const mat = useMetal();

  const positions = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const t = (i / 7) * Math.PI;
      const x = Math.cos(t) * 1.2;
      const y = -Math.sin(t) * 0.8;
      pts.push([x, y, 0]);
    }
    return pts;
  }, []);

  useFrame(() => {
    groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos} material={mat}>
          <torusGeometry args={[0.18, 0.06, 16, 40]} />
        </mesh>
      ))}
      {/* Pendant at the bottom of the arc */}
      <mesh position={[0, -0.8, 0]} material={mat}>
        <icosahedronGeometry args={[0.3, 0]} />
      </mesh>
    </group>
  );
}

/* ─── Earring ─── */
function EarringModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const mat = useMetal();
  useFrame(() => {
    groupRef.current.rotation.y += 0.004;
  });
  return (
    <group ref={groupRef}>
      {/* Left earring */}
      <group position={[-0.6, 0, 0]}>
        <mesh material={mat} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
        </mesh>
        <mesh material={mat} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.3, 0.8, 32]} />
        </mesh>
      </group>
      {/* Right earring */}
      <group position={[0.6, 0, 0]}>
        <mesh material={mat} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
        </mesh>
        <mesh material={mat} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.3, 0.8, 32]} />
        </mesh>
      </group>
    </group>
  );
}

/* ─── Bracelet ─── */
function BraceletModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const mat = useMetal();

  const beadPositions = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      pts.push([Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2]);
    }
    return pts;
  }, []);

  useFrame(() => {
    groupRef.current.rotation.y += 0.003;
  });

  return (
    <group ref={groupRef}>
      <mesh material={mat}>
        <torusGeometry args={[1.2, 0.2, 16, 80]} />
      </mesh>
      {beadPositions.map((pos, i) => (
        <mesh key={i} position={pos} material={mat}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Cuff ─── */
function CuffModel() {
  const groupRef = useRef<THREE.Group>(null!);
  const mat = useMetal();
  useFrame(() => {
    groupRef.current.rotation.y += 0.003;
  });
  return (
    <group ref={groupRef}>
      {/* Open cylinder */}
      <mesh material={mat}>
        <cylinderGeometry args={[0.9, 0.9, 0.5, 64, 1, true]} />
      </mesh>
      {/* Gap cut — a thin box that "hides" a section to simulate open cuff */}
      <mesh position={[0.9, 0, 0]}>
        <boxGeometry args={[0.35, 0.6, 0.35]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
    </group>
  );
}

/* ─── Default ─── */
function DefaultModel() {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useMetal();
  useFrame(() => {
    ref.current.rotation.x += 0.003;
    ref.current.rotation.y += 0.004;
    ref.current.rotation.z += 0.002;
  });
  return (
    <mesh ref={ref} material={mat}>
      <icosahedronGeometry args={[1, 1]} />
    </mesh>
  );
}

/* ─── Model picker ─── */
function JewelryModel({ category }: { category: Category }) {
  switch (category) {
    case "ring":
      return <RingModel />;
    case "necklace":
      return <NecklaceModel />;
    case "earring":
      return <EarringModel />;
    case "bracelet":
      return <BraceletModel />;
    case "cuff":
      return <CuffModel />;
    default:
      return <DefaultModel />;
  }
}

/* ─── Scene ─── */
function Scene({
  category,
  interactive,
}: {
  category: Category;
  interactive: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#c8f400" />
      <pointLight position={[-5, -3, -5]} intensity={0.6} color="#b14aed" />
      <spotLight position={[0, 10, 0]} intensity={0.8} penumbra={1} />
      <JewelryModel category={category} />
      {interactive && (
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
        />
      )}
    </>
  );
}

/* ─── Main export ─── */
export default function JewelryPlaceholder3D({
  category = "default",
  interactive = false,
  className = "",
}: JewelryPlaceholder3DProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        gl={{ alpha: true }}
        camera={{ position: [0, 0, 4], fov: 45 }}
        style={{ background: "transparent" }}
      >
        <Scene category={category} interactive={interactive} />
      </Canvas>
    </div>
  );
}
