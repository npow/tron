import * as THREE from 'three';
import { RoadSegmentDef, BuildingFootprint } from '../types';

export function buildSanFranciscoCityMesh(
  scene: THREE.Scene,
  roads: RoadSegmentDef[],
  buildings: BuildingFootprint[]
) {
  const textureLoader = new THREE.TextureLoader();

  // 1. World Labs Marble 360° Skybox Dome
  textureLoader.load(
    '/assets/scene_pano.png',
    (panoTexture) => {
      panoTexture.mapping = THREE.EquirectangularReflectionMapping;
      panoTexture.colorSpace = THREE.SRGBColorSpace;
      scene.environment = panoTexture;

      const skyGeo = new THREE.SphereGeometry(4500, 32, 32);
      skyGeo.scale(-1, 1, 1);
      const skyMat = new THREE.MeshBasicMaterial({
        map: panoTexture,
        fog: false,
      });
      const skyDome = new THREE.Mesh(skyGeo, skyMat);
      skyDome.position.y = 200;
      scene.add(skyDome);
    },
    undefined,
    (err) => console.warn('Could not load pano texture', err)
  );

  // 2. Cyberpunk Ground Plane & Ocean
  const groundGeo = new THREE.PlaneGeometry(9000, 9000, 64, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.85,
    metalness: 0.3,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.15;
  scene.add(ground);

  // High-Density Neon Grid Overlay
  const gridHelper = new THREE.GridHelper(9000, 300, 0x00f3ff, 0x0f172a);
  gridHelper.position.y = 0.02;
  scene.add(gridHelper);

  // San Francisco Bay Water Body (Reflective Cyber Water)
  const waterGeo = new THREE.PlaneGeometry(5000, 9000);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x011425,
    roughness: 0.1,
    metalness: 0.95,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(3350, -0.3, 0);
  scene.add(water);

  // 3. Generate Procedural Window Texture for Skyscrapers
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, 128, 256);
    // Draw lit windows
    for (let y = 8; y < 256; y += 12) {
      for (let x = 6; x < 128; x += 10) {
        if (Math.random() > 0.45) {
          const randColor = Math.random();
          ctx.fillStyle = randColor > 0.7 ? '#00f3ff' : randColor > 0.4 ? '#38bdf8' : '#ffe600';
          ctx.fillRect(x, y, 6, 8);
        }
      }
    }
  }
  const windowTexture = new THREE.CanvasTexture(canvas);
  windowTexture.wrapS = THREE.RepeatWrapping;
  windowTexture.wrapT = THREE.RepeatWrapping;

  // 4. High-End Road Materials
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.25,
    metalness: 0.8,
  });

  const neonLaneMat = new THREE.MeshBasicMaterial({
    color: 0x00f3ff,
  });

  const neonShoulderMat = new THREE.MeshBasicMaterial({
    color: 0xff0055,
  });

  roads.forEach((road) => {
    const start = new THREE.Vector3(road.start.x, road.start.y, road.start.z);
    const end = new THREE.Vector3(road.end.x, road.end.y, road.end.z);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    if (length < 1) return;

    const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

    // Road Ribbon Mesh
    const halfW = road.width * 0.5;
    const p1 = new THREE.Vector3().copy(start).addScaledVector(normal, -halfW);
    const p2 = new THREE.Vector3().copy(start).addScaledVector(normal, halfW);
    const p3 = new THREE.Vector3().copy(end).addScaledVector(normal, -halfW);
    const p4 = new THREE.Vector3().copy(end).addScaledVector(normal, halfW);

    const roadGeo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      p1.x, p1.y + 0.05, p1.z,
      p2.x, p2.y + 0.05, p2.z,
      p3.x, p3.y + 0.05, p3.z,
      p2.x, p2.y + 0.05, p2.z,
      p4.x, p4.y + 0.05, p4.z,
      p3.x, p3.y + 0.05, p3.z,
    ]);
    roadGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    roadGeo.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    scene.add(roadMesh);

    // Glowing Neon Shoulders
    const leftShoulderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1.x, p1.y + 0.1, p1.z),
      new THREE.Vector3(p3.x, p3.y + 0.1, p3.z),
    ]);
    const rightShoulderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p2.x, p2.y + 0.1, p2.z),
      new THREE.Vector3(p4.x, p4.y + 0.1, p4.z),
    ]);

    const leftLine = new THREE.Line(leftShoulderGeo, neonShoulderMat);
    const rightLine = new THREE.Line(rightShoulderGeo, neonShoulderMat);
    scene.add(leftLine);
    scene.add(rightLine);

    // Glowing Centerline
    const centerLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start.x, start.y + 0.12, start.z),
      new THREE.Vector3(end.x, end.y + 0.12, end.z),
    ]);
    const centerLine = new THREE.Line(centerLineGeo, neonLaneMat);
    scene.add(centerLine);

    // Bay Bridge Tower & Cables
    if (road.isElevated) {
      const pillarCount = Math.floor(length / 180);
      for (let p = 0; p <= pillarCount; p++) {
        const t = p / Math.max(1, pillarCount);
        const pillarPos = new THREE.Vector3().lerpVectors(start, end, t);
        const pillarGeo = new THREE.BoxGeometry(8, pillarPos.y, 8);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(pillarPos.x, pillarPos.y * 0.5, pillarPos.z);
        scene.add(pillar);

        if (p === Math.floor(pillarCount / 2)) {
          const towerGeo = new THREE.BoxGeometry(10, 140, 10);
          const towerMat = new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            metalness: 0.9,
            emissive: 0x581c87,
            emissiveIntensity: 0.8,
          });
          const tower = new THREE.Mesh(towerGeo, towerMat);
          tower.position.set(pillarPos.x, 70, pillarPos.z);
          scene.add(tower);

          // Glowing Suspension Cable
          const cableGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(start.x, start.y + 5, start.z),
            new THREE.Vector3(pillarPos.x, 135, pillarPos.z),
            new THREE.Vector3(end.x, end.y + 5, end.z),
          ]);
          const cableMat = new THREE.LineBasicMaterial({ color: 0xc084fc, linewidth: 2 });
          const cable = new THREE.Line(cableGeo, cableMat);
          scene.add(cable);
        }
      }
    }
  });

  // 5. Build High-Fidelity Buildings & Landmarks
  buildings.forEach((bld) => {
    if (bld.landmarkType === 'salesforce') {
      // Salesforce Cyber-Tower (Glowing obelisk with illuminated crown)
      const geo = new THREE.CylinderGeometry(bld.width * 0.35, bld.width * 0.5, bld.height, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0x0369a1,
        emissiveIntensity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(bld.center.x, bld.height * 0.5, bld.center.z);
      scene.add(mesh);

      // Apex Crown Beacon
      const crownGeo = new THREE.SphereGeometry(18, 16, 16);
      const crownMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(bld.center.x, bld.height + 6, bld.center.z);
      scene.add(crown);

      // Apex Point Light
      const apexLight = new THREE.PointLight(0x00f3ff, 8, 400);
      apexLight.position.copy(crown.position);
      scene.add(apexLight);
      return;
    }

    if (bld.landmarkType === 'transamerica') {
      // Transamerica Pyramid
      const geo = new THREE.ConeGeometry(bld.width * 0.65, bld.height, 4);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.9,
        roughness: 0.15,
        emissive: 0x854d0e,
        emissiveIntensity: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = Math.PI / 4;
      mesh.position.set(bld.center.x, bld.height * 0.5, bld.center.z);
      scene.add(mesh);

      const spireGeo = new THREE.CylinderGeometry(1.5, 2.5, 50, 8);
      const spireMat = new THREE.MeshBasicMaterial({ color: 0xffe600 });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.set(bld.center.x, bld.height + 25, bld.center.z);
      scene.add(spire);

      const spireLight = new THREE.PointLight(0xffe600, 6, 350);
      spireLight.position.copy(spire.position);
      scene.add(spireLight);
      return;
    }

    if (bld.landmarkType === 'ferry_building') {
      const geo = new THREE.BoxGeometry(bld.width, bld.height * 0.35, bld.depth);
      const mat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(bld.center.x, (bld.height * 0.35) * 0.5, bld.center.z);
      scene.add(mesh);

      const towerGeo = new THREE.BoxGeometry(24, bld.height, 24);
      const towerMat = new THREE.MeshStandardMaterial({
        color: 0xe11d48,
        emissive: 0x9f1239,
        emissiveIntensity: 0.7,
      });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(bld.center.x, bld.height * 0.5, bld.center.z);
      scene.add(tower);
      return;
    }

    if (bld.landmarkType === 'coit_tower') {
      const geo = new THREE.CylinderGeometry(bld.width * 0.4, bld.width * 0.5, bld.height, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        emissive: 0x15803d,
        emissiveIntensity: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(bld.center.x, bld.height * 0.5, bld.center.z);
      scene.add(mesh);
      return;
    }

    // Standard Skyscraper Block with Texture & Neon Edges
    const bldTex = windowTexture.clone();
    bldTex.repeat.set(Math.max(1, Math.floor(bld.width / 20)), Math.max(1, Math.floor(bld.height / 25)));
    bldTex.needsUpdate = true;

    const bldGeo = new THREE.BoxGeometry(bld.width, bld.height, bld.depth);
    const bldMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      map: bldTex,
      emissiveMap: bldTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.2,
    });
    const mesh = new THREE.Mesh(bldGeo, bldMat);
    mesh.position.set(bld.center.x, bld.height * 0.5, bld.center.z);
    scene.add(mesh);

    // Glowing Neon Rooftop Trim
    const wireGeo = new THREE.EdgesGeometry(bldGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: bld.color ? new THREE.Color(bld.color) : 0x00f3ff,
      linewidth: 1,
    });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    wire.position.copy(mesh.position);
    scene.add(wire);
  });
}
