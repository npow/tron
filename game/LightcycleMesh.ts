import * as THREE from 'three';

export interface LightcycleVisuals {
  group: THREE.Group;
  frontWheel: THREE.Group;
  rearWheel: THREE.Group;
  bodyMesh: THREE.Mesh;
  glowMeshes: THREE.Mesh[];
  exhaustLight: THREE.PointLight;
  underglowLight: THREE.PointLight;
  boostParticles: THREE.Points;
  updateAnimation: (delta: number, speedKmh: number, isBoosting: boolean, isDrifting: boolean, steerAngle: number) => void;
}

export function createLightcycleMesh(themeColor: string = '#00f3ff'): LightcycleVisuals {
  const group = new THREE.Group();
  const color = new THREE.Color(themeColor);
  const glowMeshes: THREE.Mesh[] = [];

  // Materials
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0d14,
    metalness: 0.95,
    roughness: 0.15,
  });

  const secondaryMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.3,
  });

  const neonMaterial = new THREE.MeshBasicMaterial({
    color: color,
  });

  const canopyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x020617,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.85,
    transparent: true,
    opacity: 0.8,
  });

  // 1. Central Chassis Body
  const bodyGeo = new THREE.BoxGeometry(0.85, 0.45, 2.8);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
  bodyMesh.position.y = 0.55;
  group.add(bodyMesh);

  // 2. Tapered Front Cowling
  const cowlGeo = new THREE.ConeGeometry(0.48, 1.2, 5);
  const cowlMesh = new THREE.Mesh(cowlGeo, bodyMaterial);
  cowlMesh.rotation.x = Math.PI / 2;
  cowlMesh.position.set(0, 0.52, 1.6);
  group.add(cowlMesh);

  // 3. Cockpit Canopy
  const canopyGeo = new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMaterial);
  canopyMesh.scale.set(0.9, 0.6, 2.0);
  canopyMesh.position.set(0, 0.72, 0.1);
  group.add(canopyMesh);

  // 4. Glowing Neon Side Strips
  const leftStripGeo = new THREE.BoxGeometry(0.04, 0.08, 2.2);
  const leftStrip = new THREE.Mesh(leftStripGeo, neonMaterial);
  leftStrip.position.set(0.44, 0.55, 0);
  group.add(leftStrip);
  glowMeshes.push(leftStrip);

  const rightStripGeo = new THREE.BoxGeometry(0.04, 0.08, 2.2);
  const rightStrip = new THREE.Mesh(rightStripGeo, neonMaterial);
  rightStrip.position.set(-0.44, 0.55, 0);
  group.add(rightStrip);
  glowMeshes.push(rightStrip);

  // 5. Rear Spoiler / Twin Fin
  const finGeo = new THREE.BoxGeometry(0.06, 0.4, 0.6);
  const leftFin = new THREE.Mesh(finGeo, secondaryMaterial);
  leftFin.position.set(0.35, 0.85, -1.1);
  leftFin.rotation.z = -0.15;
  group.add(leftFin);

  const rightFin = new THREE.Mesh(finGeo, secondaryMaterial);
  rightFin.position.set(-0.35, 0.85, -1.1);
  rightFin.rotation.z = 0.15;
  group.add(rightFin);

  // Neon fin edges
  const finGlowGeo = new THREE.BoxGeometry(0.02, 0.42, 0.05);
  const leftFinGlow = new THREE.Mesh(finGlowGeo, neonMaterial);
  leftFinGlow.position.set(0.36, 0.85, -1.38);
  group.add(leftFinGlow);
  glowMeshes.push(leftFinGlow);

  const rightFinGlow = new THREE.Mesh(finGlowGeo, neonMaterial);
  rightFinGlow.position.set(-0.36, 0.85, -1.38);
  group.add(rightFinGlow);
  glowMeshes.push(rightFinGlow);

  // 6. Hubless Glowing Cyber-Wheels
  function createCyberWheel(radius: number, thickness: number): { wheelGroup: THREE.Group; rimGlow: THREE.Mesh } {
    const wGroup = new THREE.Group();

    // Outer tire ring
    const tireGeo = new THREE.TorusGeometry(radius, thickness, 16, 32);
    const tireMesh = new THREE.Mesh(tireGeo, bodyMaterial);
    wGroup.add(tireMesh);

    // Glowing Neon Inner Rim
    const rimGeo = new THREE.TorusGeometry(radius * 0.92, thickness * 0.4, 16, 32);
    const rimMesh = new THREE.Mesh(rimGeo, neonMaterial);
    wGroup.add(rimMesh);

    // Rotating Energy Spokes
    for (let i = 0; i < 3; i++) {
      const spokeGeo = new THREE.BoxGeometry(thickness * 0.5, radius * 1.8, thickness * 0.3);
      const spokeMesh = new THREE.Mesh(spokeGeo, neonMaterial);
      spokeMesh.rotation.z = (i * Math.PI) / 3;
      wGroup.add(spokeMesh);
    }

    return { wheelGroup: wGroup, rimGlow: rimMesh };
  }

  // Front Wheel
  const frontWheelData = createCyberWheel(0.55, 0.16);
  const frontWheel = frontWheelData.wheelGroup;
  frontWheel.rotation.y = Math.PI / 2;
  frontWheel.position.set(0, 0.55, 1.4);
  group.add(frontWheel);
  glowMeshes.push(frontWheelData.rimGlow);

  // Rear Wheel (Thicker & Wider)
  const rearWheelData = createCyberWheel(0.65, 0.24);
  const rearWheel = rearWheelData.wheelGroup;
  rearWheel.rotation.y = Math.PI / 2;
  rearWheel.position.set(0, 0.65, -1.2);
  group.add(rearWheel);
  glowMeshes.push(rearWheelData.rimGlow);

  // 7. Dynamic Lights
  const underglowLight = new THREE.PointLight(color, 2.5, 6);
  underglowLight.position.set(0, 0.2, 0);
  group.add(underglowLight);

  const exhaustLight = new THREE.PointLight(color, 4.0, 10);
  exhaustLight.position.set(0, 0.55, -1.6);
  group.add(exhaustLight);

  // 8. Nitro Boost Particle System
  const particleCount = 40;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i++) {
    particlePositions[i] = (Math.random() - 0.5) * 0.4;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: color,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });
  const boostParticles = new THREE.Points(particleGeo, particleMat);
  boostParticles.position.set(0, 0.55, -1.7);
  group.add(boostParticles);

  // Animation loop
  const updateAnimation = (delta: number, speedKmh: number, isBoosting: boolean, isDrifting: boolean, steerAngle: number) => {
    const wheelSpinSpeed = (speedKmh / 3.6) * 1.8 * delta;
    frontWheel.rotation.x += wheelSpinSpeed;
    rearWheel.rotation.x += wheelSpinSpeed;

    // Front fork steering rotation
    frontWheel.rotation.y = Math.PI / 2 + steerAngle * 0.6;

    // Nitro exhaust flicker
    if (isBoosting) {
      exhaustLight.intensity = 6.0 + Math.random() * 3.0;
      particleMat.opacity = 0.9;
      particleMat.size = 0.25;
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 2] -= (10 + Math.random() * 20) * delta;
        if (positions[i * 3 + 2] < -3.5) {
          positions[i * 3 + 2] = 0;
          positions[i * 3] = (Math.random() - 0.5) * 0.3;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;
    } else {
      exhaustLight.intensity = 2.0 + (speedKmh / 350) * 2.0;
      particleMat.opacity = Math.max(0, (speedKmh / 350) * 0.4);
      particleMat.size = 0.12;
    }
  };

  return {
    group,
    frontWheel,
    rearWheel,
    bodyMesh,
    glowMeshes,
    exhaustLight,
    underglowLight,
    boostParticles,
    updateAnimation,
  };
}
