import * as THREE from 'three';
import { TrailPoint, TrailWallSegment } from '../types';

export class TrailSystem {
  private points: TrailPoint[] = [];
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private maxPoints: number = 600;
  private maxTrailDistance: number = 1200; // 1.2km active lethal trail buffer
  private trailHeight: number = 1.6;
  private totalDistance: number = 0;
  private lastPosition: THREE.Vector3 | null = null;
  public playerId: string;
  public playerColor: string;

  constructor(scene: THREE.Scene, playerId: string, playerColor: string) {
    this.playerId = playerId;
    this.playerColor = playerColor;

    // Buffer geometry for dynamic quad strips
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxPoints * 2 * 3); // 2 vertices per slice (bottom, top)
    const uvs = new Float32Array(this.maxPoints * 2 * 2);
    const indices: number[] = [];

    for (let i = 0; i < this.maxPoints - 1; i++) {
      const b1 = i * 2;
      const t1 = i * 2 + 1;
      const b2 = (i + 1) * 2;
      const t2 = (i + 1) * 2 + 1;

      // Quad 1: b1 -> b2 -> t1
      indices.push(b1, b2, t1);
      // Quad 2: t1 -> b2 -> t2
      indices.push(t1, b2, t2);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(indices);

    // Custom Tron Glowing Energy Ribbon Shader
    const colorObj = new THREE.Color(playerColor);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: colorObj },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
          // Vertical intensity: intense at top and bottom edges, bright core
          float edgeGlow = pow(abs(vUv.y - 0.5) * 2.0, 2.0);
          float coreGlow = exp(-abs(vUv.y - 0.5) * 6.0);

          // Trailing fade along length (vUv.x goes from 0 at tail to 1 at head)
          float tailFade = smoothstep(0.0, 0.15, vUv.x);

          // Pulsing horizontal scanlines
          float scanline = sin(vWorldPosition.y * 20.0 - uTime * 8.0) * 0.15 + 0.85;

          vec3 finalColor = uColor * (coreGlow * 1.8 + edgeGlow * 1.2 + 0.4) * scanline;
          float alpha = (coreGlow * 0.95 + edgeGlow * 0.7 + 0.3) * tailFade;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  public addPoint(pos: THREE.Vector3, time: number) {
    if (this.lastPosition) {
      const stepDist = this.lastPosition.distanceTo(pos);
      if (stepDist < 0.3) return; // ignore micro movements
      this.totalDistance += stepDist;
    }
    this.lastPosition = pos.clone();

    this.points.push({
      x: pos.x,
      y: pos.y,
      z: pos.z,
      time,
      distance: this.totalDistance,
    });

    // Prune tail points exceeding maxTrailDistance
    while (
      this.points.length > 2 &&
      this.totalDistance - this.points[0].distance > this.maxTrailDistance
    ) {
      this.points.shift();
    }

    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }

    this.updateGeometry();
  }

  private updateGeometry() {
    const count = this.points.length;
    if (count < 2) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const uvs = this.geometry.attributes.uv.array as Float32Array;

    const totalLen = Math.max(1, this.points[count - 1].distance - this.points[0].distance);

    for (let i = 0; i < count; i++) {
      const p = this.points[i];
      const normDist = (p.distance - this.points[0].distance) / totalLen;

      // Bottom vertex
      positions[i * 6 + 0] = p.x;
      positions[i * 6 + 1] = p.y;
      positions[i * 6 + 2] = p.z;
      uvs[i * 4 + 0] = normDist;
      uvs[i * 4 + 1] = 0.0;

      // Top vertex
      positions[i * 6 + 3] = p.x;
      positions[i * 6 + 4] = p.y + this.trailHeight;
      positions[i * 6 + 5] = p.z;
      uvs[i * 4 + 2] = normDist;
      uvs[i * 4 + 3] = 1.0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
    this.geometry.setDrawRange(0, (count - 1) * 6);
  }

  public getSegments(): TrailWallSegment[] {
    const segments: TrailWallSegment[] = [];
    const count = this.points.length;
    if (count < 2) return segments;

    // Exclude the most recent 2 points near the bike to prevent self-collision
    for (let i = 0; i < count - 2; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0.01) {
        segments.push({
          id: `${this.playerId}_seg_${i}`,
          playerId: this.playerId,
          playerColor: this.playerColor,
          x1: p1.x,
          y1: p1.y,
          z1: p1.z,
          x2: p2.x,
          y2: p2.y,
          z2: p2.z,
          height: this.trailHeight,
          createdAt: p1.time,
          length: len,
        });
      }
    }
    return segments;
  }

  public updateTime(time: number) {
    this.material.uniforms.uTime.value = time;
  }

  public clear() {
    this.points = [];
    this.lastPosition = null;
    this.totalDistance = 0;
    this.geometry.setDrawRange(0, 0);
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
