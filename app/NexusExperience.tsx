"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Edges,
  Lightformer,
  Line,
  RoundedBox,
  Environment,
} from "@react-three/drei";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type SequenceStage = "idle" | "processing" | "ready";

const CUBE_POSITION = new THREE.Vector3(1.45, 0.05, 0);

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function CameraRig({
  stage,
  reducedMotion,
}: {
  stage: SequenceStage;
  reducedMotion: boolean;
}) {
  const { camera, size } = useThree();

  useFrame((state, delta) => {
    const mobile = size.width < 720;
    const t = reducedMotion
      ? 1
      : Math.min(1, Math.max(0, (state.clock.elapsedTime - 0.15) / 3.5));
    const ease = 1 - Math.pow(1 - t, 4);
    const introStart = mobile
      ? new THREE.Vector3(1.4, 1.25, 2.5)
      : new THREE.Vector3(2.75, 1.45, 2.25);
    const final = mobile
      ? new THREE.Vector3(0.1, 0.2, 8.7)
      : new THREE.Vector3(0.1, 0.25, 8.15);
    const desired = introStart.clone().lerp(final, ease);
    const processOffset = stage === "processing" ? 0.9 : stage === "ready" ? 0.25 : 0;

    desired.z -= processOffset;
    if (!reducedMotion && t >= 0.98) {
      const drift = state.clock.elapsedTime;
      desired.x += Math.sin(drift * 0.18) * 0.055 + state.pointer.x * 0.1;
      desired.y += Math.cos(drift * 0.15) * 0.035 + state.pointer.y * 0.065;
    }

    camera.position.lerp(desired, 1 - Math.exp(-delta * 2.4));
    const target = mobile
      ? new THREE.Vector3(0.35, 0.45, 0)
      : new THREE.Vector3(0.85, 0.05, 0);
    camera.lookAt(target);
  });

  return null;
}

function Atmosphere() {
  const points = useMemo(() => {
    const positions = new Float32Array(270);
    let seed = 8713;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (random() - 0.5) * 18;
      positions[i + 1] = (random() - 0.5) * 10;
      positions[i + 2] = -2 - random() * 7;
    }
    return positions;
  }, []);

  return (
    <>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#a9cfff"
          size={0.018}
          transparent
          opacity={0.3}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <gridHelper
        args={[22, 34, "#29425a", "#17212c"]}
        position={[1.5, -2.25, -1.2]}
        rotation={[0, 0, 0]}
        material-transparent
        material-opacity={0.17}
      />
    </>
  );
}

function OrbitingLight({
  stage,
  reducedMotion,
}: {
  stage: SequenceStage;
  reducedMotion: boolean;
}) {
  const light = useRef<THREE.PointLight>(null);
  const source = useRef<THREE.Group>(null);

  useFrame((state) => {
    const speed = reducedMotion ? 0 : stage === "processing" ? 0.78 : 0.22;
    const angle = state.clock.elapsedTime * speed;
    const x = CUBE_POSITION.x + Math.cos(angle) * 3;
    const y = 2.7 + Math.sin(angle * 0.7) * 0.22;
    const z = Math.sin(angle) * 2;

    if (light.current) light.current.position.set(x, y, z);
    if (source.current) source.current.position.set(x, y, z);
  });

  return (
    <>
      <pointLight
        ref={light}
        color="#dbeeff"
        intensity={stage === "processing" ? 105 : 72}
        distance={10}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00012}
        shadow-normalBias={0.018}
        shadow-radius={4}
      />
      <group ref={source}>
        <mesh>
          <sphereGeometry args={[0.075, 24, 24]} />
          <meshBasicMaterial color="#f3f8ff" />
        </mesh>
        <mesh scale={2.4}>
          <sphereGeometry args={[0.075, 18, 18]} />
          <meshBasicMaterial
            color="#9fc9f4"
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, -1.2, 0]} scale={[0.6, 2.5, 0.6]}>
          <coneGeometry args={[0.34, 1.6, 28, 1, true]} />
          <meshBasicMaterial
            color="#9fc9f4"
            transparent
            opacity={0.025}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}

function ProcessingPulse({ stage }: { stage: SequenceStage }) {
  const group = useRef<THREE.Group>(null);
  const edges = useRef<React.ComponentRef<typeof Edges>>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (stage === "processing") startedAt.current = performance.now();
  }, [stage]);

  useFrame(() => {
    if (!group.current || !edges.current) return;
    const elapsed = (performance.now() - startedAt.current) / 1000;
    const active = stage === "processing" && elapsed < 1.5;
    const progress = active ? Math.min(1, elapsed / 1.5) : 1;
    const scale = active ? 0.95 + progress * 0.2 : 1;
    const material = edges.current.material;

    group.current.scale.setScalar(scale);
    material.opacity = active ? Math.sin(progress * Math.PI) * 0.9 : 0;
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[2.92, 2.92, 2.92]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges
          ref={edges}
          color="#d5edff"
          transparent
          opacity={0}
          threshold={12}
        />
      </mesh>
    </group>
  );
}

function IntelligenceCore({
  stage,
  reducedMotion,
}: {
  stage: SequenceStage;
  reducedMotion: boolean;
}) {
  const core = useRef<THREE.Group>(null);
  const lightCore = useRef<THREE.Mesh>(null);
  const { size } = useThree();
  const mobile = size.width < 720;

  useFrame((state, delta) => {
    if (!core.current) return;
    const speed = reducedMotion ? 0 : 0.085;
    core.current.rotation.x += delta * speed * 0.62;
    core.current.rotation.y += delta * speed;
    core.current.rotation.z += delta * speed * 0.34;
    core.current.position.y =
      CUBE_POSITION.y +
      (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.55) * 0.055);

    if (lightCore.current) {
      const material = lightCore.current.material as THREE.MeshBasicMaterial;
      const processing = stage === "processing";
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        processing ? 0.32 : stage === "ready" ? 0.14 : 0.07,
        1 - Math.exp(-delta * 5),
      );
    }
  });

  return (
    <group
      ref={core}
      position={CUBE_POSITION}
      rotation={[0.32, -0.48, 0.16]}
      scale={mobile ? 0.82 : 1}
    >
      <RoundedBox
        args={[2.85, 2.85, 2.85]}
        radius={0.13}
        smoothness={12}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color="#0a0f14"
          metalness={0.93}
          roughness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={2.6}
          emissive="#10263a"
          emissiveIntensity={stage === "processing" ? 0.24 : 0.085}
        />
        <Edges color="#9ec8ef" transparent opacity={0.55} threshold={16} />
      </RoundedBox>

      <RoundedBox args={[2.58, 2.58, 2.58]} radius={0.08} smoothness={9}>
        <meshPhysicalMaterial
          color="#89c9ff"
          transparent
          opacity={0.035}
          roughness={0.18}
          transmission={0.2}
          depthWrite={false}
        />
      </RoundedBox>

      <mesh ref={lightCore}>
        <boxGeometry args={[1.8, 1.8, 1.8]} />
        <meshBasicMaterial
          color="#74b8f4"
          transparent
          opacity={0.07}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[1.12, 0.012, 8, 96]} />
        <meshBasicMaterial
          color="#c7e4ff"
          transparent
          opacity={stage === "processing" ? 0.55 : 0.12}
          depthWrite={false}
        />
      </mesh>

      <ProcessingPulse stage={stage} />
    </group>
  );
}

const signalStarts: [number, number, number][] = [
  [-2.8, 1.6, 0.6],
  [4.8, 1.25, -0.2],
  [3.75, -2.05, 0.7],
];

function SignalNodes({
  stage,
  reducedMotion,
}: {
  stage: SequenceStage;
  reducedMotion: boolean;
}) {
  const groups = useRef<Array<THREE.Group | null>>([]);
  const triggeredAt = useRef(0);

  useEffect(() => {
    if (stage === "processing") triggeredAt.current = performance.now();
  }, [stage]);

  useFrame(() => {
    const elapsed = (performance.now() - triggeredAt.current) / 1000;
    groups.current.forEach((group, index) => {
      if (!group) return;
      const delay = index * 0.18;
      const raw = reducedMotion ? 1 : Math.max(0, Math.min(1, (elapsed - delay) / 0.95));
      const eased = 1 - Math.pow(1 - raw, 3);
      const visible = stage === "processing" && elapsed > delay && elapsed < 1.55 + delay;
      const start = signalStarts[index];

      group.visible = visible;
      group.position.set(
        THREE.MathUtils.lerp(start[0], CUBE_POSITION.x, eased),
        THREE.MathUtils.lerp(start[1], CUBE_POSITION.y, eased),
        THREE.MathUtils.lerp(start[2], CUBE_POSITION.z, eased),
      );
      group.scale.setScalar(0.7 + Math.sin(raw * Math.PI) * 0.55);
    });
  });

  if (stage !== "processing") return null;

  return (
    <>
      {signalStarts.map((start, index) => (
        <group
          key={index}
          ref={(node) => {
            groups.current[index] = node;
          }}
          position={start}
        >
          <mesh>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshBasicMaterial color="#e2f2ff" />
          </mesh>
          <mesh scale={2.7}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial
              color="#83c5ff"
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
      {signalStarts.map((start, index) => (
        <Line
          key={`line-${index}`}
          points={[start, CUBE_POSITION.toArray()]}
          color="#76b9ee"
          transparent
          opacity={0.16}
          lineWidth={0.5}
        />
      ))}
    </>
  );
}

function NexusScene({
  stage,
  reducedMotion,
}: {
  stage: SequenceStage;
  reducedMotion: boolean;
}) {
  const { size } = useThree();
  const mobile = size.width < 720;

  return (
    <>
      <color attach="background" args={["#080a0d"]} />
      <fog attach="fog" args={["#080a0d", 8, 18]} />
      <ambientLight intensity={mobile ? 0.22 : 0.15} color="#a9c4db" />
      <directionalLight
        position={[-5, 4, 5]}
        intensity={2.8}
        color="#c7d6e5"
      />
      <directionalLight
        position={[4, -2, -4]}
        intensity={2}
        color="#477aa4"
      />
      <Environment resolution={512}>
        <Lightformer
          intensity={5}
          rotation-y={Math.PI / 2}
          position={[-4, 2, 3]}
          scale={[2, 6, 1]}
          color="#d9e8f5"
        />
        <Lightformer
          intensity={2.5}
          rotation-y={-Math.PI / 2}
          position={[5, 1, -2]}
          scale={[2, 5, 1]}
          color="#75a5ce"
        />
      </Environment>
      <group position={mobile ? [-1.25, 0.85, 0] : [0, 0, 0]}>
        <Atmosphere />
        <OrbitingLight stage={stage} reducedMotion={reducedMotion} />
        <IntelligenceCore stage={stage} reducedMotion={reducedMotion} />
        <SignalNodes stage={stage} reducedMotion={reducedMotion} />
        <ContactShadows
          position={[1.45, -1.72, 0]}
          opacity={0.52}
          scale={7}
          blur={2.6}
          far={4.2}
          color="#000000"
          resolution={1024}
          smooth
        />
      </group>
      <CameraRig stage={stage} reducedMotion={reducedMotion} />
    </>
  );
}

const contextSignals = [
  { index: "01", label: "Weather", value: "Rain likely" },
  { index: "02", label: "Traffic", value: "+20 min" },
  { index: "03", label: "Schedule", value: "10:00 AM lecture" },
];

export function NexusExperience() {
  const [stage, setStage] = useState<SequenceStage>("idle");
  const [sequenceKey, setSequenceKey] = useState(0);
  const timeouts = useRef<number[]>([]);
  const shell = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(
    () => () => {
      timeouts.current.forEach((timeout) => window.clearTimeout(timeout));
    },
    [],
  );

  const runSequence = useCallback(() => {
    timeouts.current.forEach((timeout) => window.clearTimeout(timeout));
    setSequenceKey((value) => value + 1);
    setStage("processing");
    timeouts.current = [
      window.setTimeout(() => setStage("ready"), reducedMotion ? 150 : 2150),
    ];
  }, [reducedMotion]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!shell.current) return;
    shell.current.style.setProperty("--cursor-x", `${event.clientX}px`);
    shell.current.style.setProperty("--cursor-y", `${event.clientY}px`);
  }, []);

  const status =
    stage === "processing"
      ? "CONNECTING SIGNALS"
      : stage === "ready"
        ? "INSIGHT READY"
        : "OBSERVING";

  return (
    <main
      ref={shell}
      className={`nexus-shell is-${stage}`}
      onPointerMove={handlePointerMove}
    >
      <div className="cursor-light" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="spatial-lines" aria-hidden="true" />

      <div className="scene-wrap" aria-hidden="true">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [2.75, 1.45, 2.25], fov: 31, near: 0.1, far: 40 }}
          shadows="soft"
          gl={{
            antialias: true,
            alpha: false,
            precision: "highp",
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.92,
          }}
        >
          <NexusScene stage={stage} reducedMotion={reducedMotion} />
        </Canvas>
      </div>

      <header className="system-header">
        <div className="brand-lockup" aria-label="Nexus AI">
          <span className="logo-crop" aria-hidden="true">
            <Image
              src="/nexus-logo.svg"
              alt=""
              fill
              sizes="38px"
              priority
              unoptimized
            />
          </span>
          <span className="brand-name">
            NEXUS <b>AI</b>
          </span>
        </div>

        <div className="system-online">
          <span className="online-dot" />
          <span>SYSTEM ONLINE</span>
          <span className="system-id">NX / 01</span>
        </div>
      </header>

      <section className="hero-copy" aria-labelledby="hero-title">
        <div className="eyebrow">
          <span>Predictive personal intelligence</span>
          <span className="eyebrow-line" />
        </div>
        <h1 id="hero-title">
          <span>NEXUS</span>
          <strong>AI</strong>
        </h1>
        <p className="tagline">The AI That Knows What You Need Before You Ask.</p>
        <p className="supporting-copy">
          An intelligent personal layer that connects your routines, understands
          context and acts before small problems become interruptions.
        </p>
        <div className="hero-actions">
          <Link className="primary-action" href="/app/today">
            <span>Preview My Day</span>
            <span className="action-glyph" aria-hidden="true">
              ↗
            </span>
          </Link>
          <button className="text-action" type="button" onClick={runSequence}>
            Explore the intelligence
            <span aria-hidden="true">—</span>
          </button>
        </div>
      </section>

      <div className="signal-labels" key={`signals-${sequenceKey}`} aria-hidden="true">
        {contextSignals.map((signal, index) => (
          <div
            className={`signal-label signal-label-${index + 1}`}
            key={signal.label}
          >
            <span>{signal.index}</span>
            <span>{signal.label}</span>
          </div>
        ))}
      </div>

      <aside
        className="insight-card"
        key={`insight-${sequenceKey}`}
        aria-live="polite"
        aria-hidden={stage !== "ready"}
      >
        <div className="insight-head">
          <div>
            <span className="insight-kicker">Predicted action</span>
            <h2>Good morning, Investor.</h2>
          </div>
          <span className="insight-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <p>
          Rain is expected near campus. Leave 20 minutes early and carry an
          umbrella. Your 10:00 AM lecture notes are ready offline.
        </p>
        <div className="context-list">
          {contextSignals.map((signal, index) => (
            <div
              className="context-row"
              style={{ "--row-delay": `${360 + index * 120}ms` } as React.CSSProperties}
              key={signal.label}
            >
              <span className="context-index">{signal.index}</span>
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
            </div>
          ))}
        </div>
      </aside>

      <div className="corner-label corner-label-left">
        <span>CONTEXTUAL INTELLIGENCE</span>
        <b>/ 01</b>
      </div>
      <div className="corner-label corner-label-right" aria-live="polite">
        <span className="status-cross" aria-hidden="true" />
        <span>{status}</span>
      </div>
    </main>
  );
}
