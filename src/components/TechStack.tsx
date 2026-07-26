import * as THREE from "three";
import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture, Billboard, Html, Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

const LOGO_URLS = [
  "/images/aws.png",
  "/images/kubernetes.png",
  "/images/terraform.png",
  "/images/python.png",
  "/images/grafana.png",
  "/images/elastic.png",
  "/images/agentic-ai.png",
  "/images/langgraph.png",
  "/images/docker.png",
  "/images/prometheus.png",
  "/images/gcp.png",
  "/images/jenkins.png",
];

const TECH_NAMES = [
  "AWS", "Kubernetes", "Terraform", "Python",
  "Grafana", "Elastic", "Agentic AI", "LangGraph",
  "Docker", "Prometheus",
  "GCP", "Jenkins",
];

const CONFIG = {
  repulsionStrength: 0.075,
  repulsionRadius: 5.0,
  separationStrength: 0.1,
  separationRadius: 4.5,
  centerAvoidance: 0.008,
  damping: 0.8,
  driftSpeed: 0.012,
  driftReassignThreshold: 1.5,
  maxSpeed: 0.08,
  connectionDistance: 5.5,
  connectionOpacity: 0.0225,
  logoSize: 1.3,
  // Exclusion zone for "MY TECHSTACK" heading (3D coords at z=0)
  // Camera z=18, fov=38 → visible Y ±6.2. Heading at top:10px ≈ Y 5.0–6.2
  // Add logo-size buffer around the text
  headingZone: { xMin: -5.5, xMax: 5.5, yMin: 4.0, yMax: 6.2 },
  headingAvoidance: 0.08,
};

// Generate a drift target biased toward edges, avoiding the heading zone
function randomEdgeBiasedTarget(): THREE.Vector3 {
  const hz = CONFIG.headingZone;
  let x: number, y: number;
  let attempts = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const radiusX = 2.5 + Math.random() * 3.5;
    const radiusY = 1.5 + Math.random() * 2.0;
    x = Math.cos(angle) * radiusX;
    y = Math.sin(angle) * radiusY;
    attempts++;
    if (attempts > 20) break; // Avoid infinite loop; force will push it out
  } while (x > hz.xMin && x < hz.xMax && y > hz.yMin && y < hz.yMax);
  return new THREE.Vector3(x, y, THREE.MathUtils.randFloatSpread(2));
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  driftTarget: THREE.Vector3;
}

function useParticles(count: number): React.MutableRefObject<Particle[]> {
  const particles = useRef<Particle[]>([]);

  useMemo(() => {
    // Distribute logos evenly, avoiding the heading zone (Y 1.8–5.2)
    const hz = CONFIG.headingZone;
    particles.current = Array.from({ length: count }, (_, i) => {
      let x: number, y: number;
      let attempts = 0;
      do {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        const rx = 3.0 + Math.random() * 3.0;
        const ry = 2.0 + Math.random() * 2.5;
        x = Math.cos(angle) * rx;
        y = Math.sin(angle) * ry;
        attempts++;
        if (attempts > 20) break;
      } while (x > hz.xMin && x < hz.xMax && y > hz.yMin && y < hz.yMax);
      return {
        position: new THREE.Vector3(x, y, THREE.MathUtils.randFloatSpread(2)),
        velocity: new THREE.Vector3(),
        driftTarget: randomEdgeBiasedTarget(),
      };
    });
  }, [count]);

  return particles;
}

function MouseTracker({
  mouseWorld,
}: {
  mouseWorld: React.MutableRefObject<THREE.Vector3>;
}) {
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ pointer, camera }) => {
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      mouseWorld.current.lerp(intersection, 0.1);
    }
  });

  return null;
}

function SimulationLoop({
  particles,
  mouseWorld,
  mouseActive,
  isActive,
}: {
  particles: React.MutableRefObject<Particle[]>;
  mouseWorld: React.MutableRefObject<THREE.Vector3>;
  mouseActive: React.MutableRefObject<boolean>;
  isActive: boolean;
}) {
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!isActive) return;
    delta = Math.min(delta, 0.05);

    const pts = particles.current;

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];

      // 1. Always drift toward a wandering target (free-flowing)
      tempVec.copy(p.driftTarget).sub(p.position);
      tempVec.normalize().multiplyScalar(CONFIG.driftSpeed * delta * 60);
      p.velocity.add(tempVec);

      if (p.position.distanceTo(p.driftTarget) < CONFIG.driftReassignThreshold) {
        const t = randomEdgeBiasedTarget();
        p.driftTarget.copy(t);
      }

      // 1b. Gentle push away from center to prevent clustering
      const centerDist = Math.sqrt(p.position.x * p.position.x + p.position.y * p.position.y);
      if (centerDist < 4.5 && centerDist > 0.01) {
        const avoidStr = CONFIG.centerAvoidance * (1 - centerDist / 4.5) * delta * 60;
        tempVec.set(p.position.x, p.position.y, 0).normalize().multiplyScalar(avoidStr);
        p.velocity.add(tempVec);
      }

      // 1c. Push logos away from heading text zone
      const hz = CONFIG.headingZone;
      if (
        p.position.x > hz.xMin && p.position.x < hz.xMax &&
        p.position.y > hz.yMin && p.position.y < hz.yMax
      ) {
        // Find nearest edge and push toward it
        const distToTop = hz.yMax - p.position.y;
        const distToBottom = p.position.y - hz.yMin;
        const distToLeft = p.position.x - hz.xMin;
        const distToRight = hz.xMax - p.position.x;
        const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);
        if (minDist === distToTop) {
          tempVec.set(0, 1, 0);
        } else if (minDist === distToBottom) {
          tempVec.set(0, -1, 0);
        } else if (minDist === distToLeft) {
          tempVec.set(-1, 0, 0);
        } else {
          tempVec.set(1, 0, 0);
        }
        tempVec.multiplyScalar(CONFIG.headingAvoidance * delta * 60);
        p.velocity.add(tempVec);
      }

      // 2. Repulsion — push away from cursor when nearby
      if (mouseActive.current) {
        tempVec.copy(p.position).sub(mouseWorld.current);
        const dist = tempVec.length();
        if (dist < CONFIG.repulsionRadius && dist > 0.01) {
          const strength =
            CONFIG.repulsionStrength *
            (1 - dist / CONFIG.repulsionRadius) *
            delta * 60;
          tempVec.normalize().multiplyScalar(strength);
          p.velocity.add(tempVec);
        }
      }

      // 3. Separation between logos
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        tempVec.copy(p.position).sub(pts[j].position);
        const dist = tempVec.length();
        if (dist < CONFIG.separationRadius && dist > 0.01) {
          const push =
            CONFIG.separationStrength *
            (1 - dist / CONFIG.separationRadius) *
            delta * 60;
          tempVec.normalize().multiplyScalar(push);
          p.velocity.add(tempVec);
        }
      }

      // 3. Damping
      p.velocity.multiplyScalar(CONFIG.damping);

      // 4. Speed clamp
      if (p.velocity.length() > CONFIG.maxSpeed) {
        p.velocity.normalize().multiplyScalar(CONFIG.maxSpeed);
      }

      // 5. Integrate
      p.position.addScaledVector(p.velocity, delta * 60);
    }
  });

  return null;
}

const WHITE = new THREE.Color(1, 1, 1);

function LogoParticle({
  particle,
  textureUrl,
  name,
}: {
  particle: Particle;
  textureUrl: string;
  name: string;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const texture = useTexture(textureUrl);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.copy(particle.position);
  });

  return (
    <group ref={groupRef}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <planeGeometry args={[CONFIG.logoSize, CONFIG.logoSize]} />
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.05}
            emissive={WHITE}
            emissiveMap={texture}
            emissiveIntensity={hovered ? 0.8 : 0.2}
            toneMapped={false}
          />
        </mesh>

        <Html
          center
          position={[0, -(CONFIG.logoSize / 2 + 0.15), 0]}
          distanceFactor={10}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "12px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              fontFamily: "Geist, sans-serif",
              textAlign: "center",
              letterSpacing: "0.5px",
            }}
          >
            {name}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

function ConstellationLines({
  particles,
}: {
  particles: React.MutableRefObject<Particle[]>;
}) {
  const n = LOGO_URLS.length;
  const maxPairs = (n * (n - 1)) / 2;

  const positions = useMemo(
    () => new Float32Array(maxPairs * 6),
    [maxPairs]
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  useFrame(() => {
    let idx = 0;
    const pts = particles.current;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (pts[i].position.distanceTo(pts[j].position) < CONFIG.connectionDistance) {
          positions[idx++] = pts[i].position.x;
          positions[idx++] = pts[i].position.y;
          positions[idx++] = pts[i].position.z;
          positions[idx++] = pts[j].position.x;
          positions[idx++] = pts[j].position.y;
          positions[idx++] = pts[j].position.z;
        }
      }
    }
    positions.fill(0, idx);
    geometry.attributes.position.needsUpdate = true;
    geometry.setDrawRange(0, idx / 3);
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={CONFIG.connectionOpacity}
        depthWrite={false}
      />
    </lineSegments>
  );
}

const TechStack = () => {
  const isActive = true;
  const mouseWorld = useRef(new THREE.Vector3());
  const mouseActive = useRef(false);
  const particles = useParticles(LOGO_URLS.length);

  return (
    <div
      className="techstack"
      onPointerEnter={() => { mouseActive.current = true; }}
      onPointerLeave={() => { mouseActive.current = false; }}
    >
      <h2>My Techstack</h2>

      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 18], fov: 38 }}
        onCreated={(state) => { state.gl.toneMappingExposure = 1.5; }}
        className="tech-canvas"
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[0, 0, 5]} intensity={0.4} color="#4488ff" />

        <MouseTracker mouseWorld={mouseWorld} />
        <SimulationLoop
          particles={particles}
          mouseWorld={mouseWorld}
          mouseActive={mouseActive}
          isActive={isActive}
        />

        {LOGO_URLS.map((url, i) => (
          <LogoParticle
            key={url}
            particle={particles.current[i]}
            textureUrl={url}
            name={TECH_NAMES[i]}
          />
        ))}

        <ConstellationLines particles={particles} />

        <Environment
          files="/models/char_enviorment.hdr"
          environmentIntensity={0.4}
          environmentRotation={[0, 4, 2]}
        />

        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
};

export default TechStack;
