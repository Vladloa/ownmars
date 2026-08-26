"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import type { PlotRecord } from "@/lib/types";
import { buildSphereCells, type Point3 } from "@/lib/sphere-cells";
import { faviconUrl } from "@/lib/url";
import { Starfield } from "@/components/Starfield";

type Props = {
  plots: PlotRecord[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

function PlanetAndTerritories({ plots, selectedSlug, onSelect }: Props) {
  const { scene } = useGLTF("/models/mars.glb");
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2 / max;
    const center = box.getCenter(new THREE.Vector3());
    return {
      scale,
      position: new THREE.Vector3(-center.x * scale, -center.y * scale, -center.z * scale),
      overlayRadius: (max / 2) * 1.01,
    };
  }, [scene]);

  useLayoutEffect(() => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.visible = true;
      mesh.raycast = () => {};
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat) continue;
        mat.depthWrite = true;
        mat.depthTest = true;
        mat.needsUpdate = true;
      }
    });
  }, [scene]);

  return (
    <group scale={fit.scale} position={fit.position}>
      <primitive object={scene} />
      <TerritoryOverlay
        plots={plots}
        selectedSlug={selectedSlug}
        onSelect={onSelect}
        radius={fit.overlayRadius}
      />
    </group>
  );
}

function CellBorders({
  points,
  color,
  opacity,
  lineWidth,
}: {
  points: Point3[];
  color: string;
  opacity: number;
  lineWidth: number;
}) {
  return (
    <Line
      points={points}
      segments
      color={color}
      lineWidth={lineWidth}
      depthTest
      depthWrite={false}
      transparent
      opacity={opacity}
      renderOrder={4}
    />
  );
}

const _world = new THREE.Vector3();
const _center = new THREE.Vector3();
const _toCam = new THREE.Vector3();

function FrontFacingHtml({
  position,
  children,
}: {
  position: Point3;
  children: React.ReactNode;
}) {
  const anchor = useRef<THREE.Group>(null);
  const html = useRef<HTMLDivElement>(null);
  const { camera } = useThree();

  useFrame(() => {
    const el = html.current;
    const grp = anchor.current;
    if (!el || !grp) return;
    grp.getWorldPosition(_world);
    grp.parent?.getWorldPosition(_center);
    _toCam.copy(camera.position).sub(_world);
    _world.sub(_center);
    if (_world.lengthSq() < 1e-8) {
      el.style.display = "none";
      return;
    }
    _world.normalize();
    _toCam.normalize();
    el.style.display = _world.dot(_toCam) > 0.12 ? "" : "none";
  });

  return (
    <group ref={anchor} position={position}>
      <Html center occlude={false} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div ref={html}>{children}</div>
      </Html>
    </group>
  );
}

function OwnerBadge({ name, logo }: { name: string; logo: string | null }) {
  const [broken, setBroken] = useState(false);
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  const showImg = Boolean(logo) && !broken;

  return (
    <div className="flex max-w-[140px] items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-1.5 py-1 shadow-lg">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo ?? ""}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full bg-black object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-claimed/30 text-[13px] font-semibold text-white">
          {letter}
        </span>
      )}
      <span className="truncate pr-1.5 text-[13px] font-medium leading-none text-white">{name}</span>
    </div>
  );
}

function TerritoryOverlay({
  plots,
  selectedSlug,
  onSelect,
  radius,
}: Props & { radius: number }) {
  const cells = useMemo(() => buildSphereCells(5, radius), [radius]);
  const bySlug = useMemo(() => new Map(plots.map((p) => [p.slug, p])), [plots]);
  const [hovered, setHovered] = useState<string | null>(null);
  const { gl } = useThree();

  return (
    <group>
      {cells.map((cell) => {
        const plot = bySlug.get(cell.slug);
        const claimed = Boolean(plot?.ownerName);
        const selected = selectedSlug === cell.slug;
        const isHover = hovered === cell.slug;
        const logo = faviconUrl(plot?.ownerUrl ?? null);
        const fillColor = selected ? "#ffffff" : claimed ? "#3dcc7a" : "#E8471A";
        const fill = selected || isHover ? 0.22 : claimed ? 0.3 : 0.08;
        const lineColor = selected ? "#ffffff" : isHover ? "#fff1e6" : claimed ? "#9dffc4" : "#ffc4a8";
        const lineOpacity = selected || isHover ? 0.85 : claimed ? 0.9 : 0.1;
        const lineWidth = claimed || selected ? 2.8 : 2.2;
        return (
          <group key={cell.slug}>
            <mesh
              renderOrder={2}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(cell.slug);
                gl.domElement.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHovered((h) => (h === cell.slug ? null : h));
                gl.domElement.style.cursor = "grab";
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(cell.slug);
              }}
            >
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[cell.positions, 3]} />
              </bufferGeometry>
              <meshBasicMaterial
                color={fillColor}
                transparent
                opacity={fill}
                depthWrite={false}
                depthTest
                side={THREE.FrontSide}
                polygonOffset
                polygonOffsetFactor={-6}
                polygonOffsetUnits={-6}
              />
            </mesh>
            {cell.borderPoints.length >= 2 && (
              <CellBorders
                points={cell.borderPoints}
                color={lineColor}
                opacity={lineOpacity}
                lineWidth={lineWidth}
              />
            )}
            {claimed && plot?.ownerName && !selectedSlug && (
              <FrontFacingHtml position={cell.centroid}>
                <OwnerBadge name={plot.ownerName} logo={logo} />
              </FrontFacingHtml>
            )}
          </group>
        );
      })}
    </group>
  );
}

function SceneLights() {
  return (
    <>
      <hemisphereLight args={["#ffe2cc", "#1a0c08", 0.85]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[5, 3.2, 4]} intensity={2.15} />
      <directionalLight position={[-4, -1.2, -3]} intensity={0.45} />
    </>
  );
}

function Controls() {
  const ref = useRef<OrbitControlsType>(null);
  const resume = useRef<number | null>(null);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      autoRotate
      autoRotateSpeed={0.55}
      minDistance={1.7}
      maxDistance={4.8}
      rotateSpeed={0.55}
      onStart={() => {
        if (resume.current) window.clearTimeout(resume.current);
        if (ref.current) ref.current.autoRotate = false;
      }}
      onEnd={() => {
        resume.current = window.setTimeout(() => {
          if (ref.current) ref.current.autoRotate = true;
        }, 900);
      }}
    />
  );
}

export function MarsGlobe({ plots, selectedSlug, onSelect }: Props) {
  const claimed = plots.filter((p) => p.ownerName).length;
  return (
    <div className="relative z-0 isolate h-full min-h-0 w-full overflow-hidden rounded-3xl border border-white/10">
      <Starfield />
      <Canvas
        className="relative z-[1] touch-none cursor-grab"
        camera={{ position: [0, 0.12, 3.05], fov: 42, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.35;
        }}
      >
        <Suspense fallback={null}>
          <SceneLights />
          <PlanetAndTerritories plots={plots} selectedSlug={selectedSlug} onSelect={onSelect} />
          <Controls />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 z-[2] rounded-full border border-white/10 bg-black/50 px-3 py-1 font-mono text-[13px] uppercase tracking-widest text-dust">
        Click a region to bid · {claimed}/50 claimed
      </div>
    </div>
  );
}

useGLTF.preload("/models/mars.glb");
