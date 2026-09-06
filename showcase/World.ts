import * as T from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { WORLDS, smooth } from "./timeline";
import {
  LEVELS,
  ICE_JUMPS,
  filmPosition,
  filmBeat,
  clamp,
  surfaceAt,
  type V3,
} from "./levels";
import type { GameState } from "./simulation";
import { REPLAY_DEATHS } from "./replay";

const TAU = Math.PI * 2;
const UP = new T.Vector3(0, 1, 0);
export const wrap = (v: number, length = 1) => ((v % length) + length) % length;
function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function material(color: T.ColorRepresentation, emissive = false) {
  return emissive
    ? new T.MeshBasicMaterial({ color })
    : new T.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.55 });
}
function box(
  parent: T.Object3D,
  mat: T.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function segment(
  parent: T.Object3D,
  mat: T.Material,
  a: T.Vector3,
  b: T.Vector3,
  radius: number,
) {
  const mesh = new T.Mesh(
    new T.CylinderGeometry(radius, radius, a.distanceTo(b), 6),
    mat,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  parent.add(mesh);
  return mesh;
}

function surface(color: string, kind: number) {
  const m = new T.MeshStandardMaterial({
    color,
    roughness: kind === 1 ? 0.9 : kind === 2 ? 0.22 : 0.4,
    metalness: kind === 1 ? 0 : kind === 2 ? 0.14 : 0.55,
  });
  m.customProgramCacheKey = () => `world-surface-${kind}`;
  m.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 surfacePosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
surfacePosition=(modelMatrix*vec4(transformed,1.)).xyz;
#ifdef USE_MAP
vMapUv=surfacePosition.xz*.028;
#endif
#ifdef USE_BUMPMAP
vBumpMapUv=surfacePosition.xz*.028;
#endif`,
    );
    shader.fragmentShader =
      "varying vec3 surfacePosition; float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n" +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
   float grit=grain(floor(surfacePosition.xz*55.));
   float surfacePatch=grain(floor(surfacePosition.xz*.17));
   float ripple=sin(surfacePosition.x*.9+sin(surfacePosition.z*.23)*3.);
   diffuseColor.rgb *= .86+grit*.22+surfacePatch*.08+${kind === 1 ? ".09" : ".012"}*ripple;
  `,
    );
  };
  return m;
}
function makeBike(color: string) {
  const group = new T.Group();
  const black = material("#121c28");
  const body = new T.MeshStandardMaterial({
    color: "#d5dfe4",
    metalness: 0.55,
    roughness: 0.32,
  });
  const light = material(new T.Color(color).multiplyScalar(1.1), true);
  const white = material("#b4c3cb");
  const wheels: T.Group[] = [];
  for (const z of [-1.2, 1.35]) {
    const wheel = new T.Group();
    const tire = new T.Mesh(new T.CylinderGeometry(0.64, 0.64, 0.5, 24), black);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);
    for (const x of [-0.26, 0.26]) {
      const rim = new T.Mesh(new T.TorusGeometry(0.49, 0.045, 6, 32), light);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = x;
      wheel.add(rim);
      const hub = new T.Mesh(
        new T.CylinderGeometry(0.25, 0.25, 0.015, 12),
        body,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.x = x;
      wheel.add(hub);
      for (let j = 0; j < 3; j++) {
        const spoke = box(wheel, light, x * 1.03, 0, 0, 0.016, 0.62, 0.035);
        spoke.rotation.x = (j * TAU) / 3;
      }
    }
    wheel.position.set(0, 0.66, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const hull = box(group, body, 0, 0.76, 0, 0.85, 0.42, 2.6);
  hull.rotation.x = -0.06;
  const nose = new T.Mesh(new T.ConeGeometry(0.5, 1.25, 4), body);
  nose.rotation.set(Math.PI / 2, Math.PI / 4, 0);
  nose.position.set(0, 0.85, 1.3);
  group.add(nose);
  box(group, black, 0, 1.03, -0.25, 0.52, 0.2, 1.25);
  for (const side of [-1, 1]) {
    box(group, light, side * 0.445, 0.88, 0, 0.035, 0.055, 2.5);
    box(group, light, side * 0.35, 0.53, -0.5, 0.045, 0.065, 1.9);
    segment(
      group,
      body,
      new T.Vector3(side * 0.32, 1.2, 0.65),
      new T.Vector3(side * 0.22, 0.65, 1.35),
      0.055,
    );
    // Rider crouches into the chassis, with articulated arms and knees.
    segment(
      group,
      black,
      new T.Vector3(side * 0.24, 1.23, -0.5),
      new T.Vector3(side * 0.47, 0.95, 0.08),
      0.14,
    );
    segment(
      group,
      black,
      new T.Vector3(side * 0.47, 0.95, 0.08),
      new T.Vector3(side * 0.33, 0.55, -0.6),
      0.105,
    );
    segment(
      group,
      black,
      new T.Vector3(side * 0.27, 1.8, 0.15),
      new T.Vector3(side * 0.45, 1.35, 0.43),
      0.105,
    );
    segment(
      group,
      body,
      new T.Vector3(side * 0.45, 1.35, 0.43),
      new T.Vector3(side * 0.32, 1.17, 0.84),
      0.08,
    );
    segment(
      group,
      light,
      new T.Vector3(side * 0.29, 1.75, 0.15),
      new T.Vector3(side * 0.44, 1.38, 0.42),
      0.024,
    );
  }
  const torso = new T.Mesh(new T.CapsuleGeometry(0.28, 0.48, 4, 8), black);
  torso.rotation.x = 0.72;
  torso.position.set(0, 1.5, -0.2);
  group.add(torso);
  const spine = box(group, light, 0, 1.69, -0.42, 0.055, 0.53, 0.035);
  spine.rotation.x = 0.72;
  const helmet = new T.Mesh(new T.SphereGeometry(0.28, 16, 12), white);
  helmet.scale.set(0.92, 1, 1.16);
  helmet.position.set(0, 1.96, 0.39);
  group.add(helmet);
  const visor = new T.Mesh(
    new T.SphereGeometry(0.288, 16, 8, 0, Math.PI, 0.9, 1.15),
    light,
  );
  visor.position.copy(helmet.position);
  visor.scale.copy(helmet.scale);
  group.add(visor);
  box(group, light, 0, 0.9, 1.94, 0.32, 0.055, 0.025);
  const exhaust = box(group, light, 0, 0.64, -1.7, 0.28, 0.12, 0.45);
  const glow = new T.Mesh(
    new T.PlaneGeometry(5, 7),
    new T.ShaderMaterial({
      uniforms: { color: { value: new T.Color(color) } },
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      vertexShader:
        "varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying vec2 v; uniform vec3 color; void main(){float a=pow(max(0.,1.-length((v-.5)*2.)),3.);gl_FragColor=vec4(color,a*.6);}",
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  group.add(glow);
  return { group, wheels, exhaust };
}

class Ribbon {
  mesh: T.Mesh;
  geometry = new T.BufferGeometry();
  positions = new Float32Array(2049 * 12);
  constructor(color: string) {
    const uv = new Float32Array(2049 * 8),
      indices: number[] = [];
    for (let i = 0; i <= 2048; i++) {
      uv.set([i / 2048, 0, i / 2048, 1, i / 2048, 0, i / 2048, 1], i * 8);
      if (i < 2048) {
        const a = i * 4,
          b = a + 4;
        indices.push(
          a,
          b,
          a + 1,
          a + 1,
          b,
          b + 1,
          a + 2,
          a + 3,
          b + 2,
          a + 3,
          b + 3,
          b + 2,
          a + 1,
          b + 1,
          a + 3,
          a + 3,
          b + 1,
          b + 3,
        );
      }
    }
    this.geometry.setAttribute(
      "position",
      new T.BufferAttribute(this.positions, 3).setUsage(T.DynamicDrawUsage),
    );
    this.geometry.setAttribute("uv", new T.BufferAttribute(uv, 2));
    this.geometry.setIndex(indices);
    this.mesh = new T.Mesh(
      this.geometry,
      new T.ShaderMaterial({
        uniforms: {
          color: { value: new T.Color(color) },
          opacity: { value: 1 },
        },
        side: T.DoubleSide,
        transparent: true,
        depthWrite: false,
        vertexShader:
          "varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec2 v; uniform vec3 color; uniform float opacity; void main(){float edge=pow(abs(v.y-.5)*2.,10.);vec3 light=mix(color*1.35,vec3(1.8),edge*.65);gl_FragColor=vec4(light,(.72+edge*.28)*opacity);}",
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }
  update(points: V3[], opacity = 1) {
    const count = Math.min(2049, points.length);
    this.mesh.visible = count > 1 && opacity > 0;
    (this.mesh.material as T.ShaderMaterial).uniforms.opacity.value = opacity;
    for (let i = 0; i < count; i++) {
      const j = Math.round((i * (points.length - 1)) / Math.max(1, count - 1));
      const p = points[j],
        previous = points[Math.max(0, j - 1)],
        next = points[Math.min(points.length - 1, j + 1)];
      const dx = next[0] - previous[0],
        dz = next[2] - previous[2],
        length = Math.hypot(dx, dz) || 1;
      const nx = (dz / length) * 0.16,
        nz = (-dx / length) * 0.16;
      this.positions.set(
        [
          p[0] + nx,
          p[1] + 0.12,
          p[2] + nz,
          p[0] + nx,
          p[1] + 1.6,
          p[2] + nz,
          p[0] - nx,
          p[1] + 0.12,
          p[2] - nz,
          p[0] - nx,
          p[1] + 1.6,
          p[2] - nz,
        ],
        i * 12,
      );
    }
    this.geometry.setDrawRange(0, Math.max(0, count - 1) * 18);
    this.geometry.attributes.position.needsUpdate = true;
  }
}
export type RideInput = GameState;
export interface Telemetry {
  speed: number;
  boost: boolean;
  drift: boolean;
  airborne: boolean;
  combat: boolean;
  position: T.Vector3;
  progress: number;
  label: string;
  detail: string;
  metric: string;
  alive: number;
  energy: number;
  status: string;
  chapter: number;
}
const vec = (p: V3) => new T.Vector3(...p);
export class World {
  scene = new T.Scene();
  backgroundScene = new T.Scene();
  backgroundCamera = new T.PerspectiveCamera(56, 16 / 9, 0.01, 4000);
  camera = new T.PerspectiveCamera(56, 16 / 9, 0.15, 4000);
  index: number;
  length = 25;
  roadWidth = 24;
  bikes: ReturnType<typeof makeBike>[] = [];
  ribbons: Ribbon[] = [];
  telemetry: Telemetry = {
    speed: 0,
    boost: false,
    drift: false,
    airborne: false,
    combat: false,
    position: new T.Vector3(),
    progress: 0,
    label: "",
    detail: "",
    metric: "",
    alive: 1,
    energy: 100,
    status: "running",
    chapter: 0,
  };
  private rnd: () => number;
  private doors: T.Group[] = [];
  private checkpoints: T.Group[] = [];
  private drones: T.Group[] = [];
  private particles: T.Points[] = [];
  private particleSeeds: Float32Array;
  private shadows: T.Mesh[] = [];
  private sky: T.Mesh;
  private ground: T.Mesh;
  ready: Promise<void>;
  environmentReady = false;
  spark: SparkRenderer;
  private splat?: SplatMesh;
  constructor(
    index: number,
    renderer: T.WebGLRenderer,
    private offline = false,
  ) {
    this.spark = new SparkRenderer({
      renderer,
      autoUpdate: !offline,
      enableLod: false,
      maxPixelRadius: 128,
      encodeLinear: true,
    });
    this.backgroundScene.add(this.spark);
    this.index = index;
    this.rnd = random(221 + index * 73);
    const palettes = [
      ["#7891a8", "#a1b3bc", "#202832"],
      ["#c6ad9e", "#e8c8a1", "#b1906e"],
      ["#506d86", "#9bc4ce", "#567b8c"],
      ["#292c37", "#959dae", "#252831"],
    ];
    const [sky, horizon, ground] = palettes[index];
    this.backgroundScene.background = new T.Color(sky);
    this.scene.fog = new T.FogExp2(sky, index === 3 ? 0.0013 : 0.00055);
    this.scene.add(new T.HemisphereLight(horizon, ground, 2.1));
    const sun = new T.DirectionalLight(
      index === 1 ? "#ffe2b5" : "#e3efff",
      3.4,
    );
    sun.position.set(-150, 220, 80);
    this.scene.add(sun);
    this.scene.add(new T.AmbientLight("#ffffff", 0.2));
    this.sky = new T.Mesh(
      new T.SphereGeometry(2400, 64, 32),
      new T.MeshBasicMaterial({
        color: sky,
        side: T.BackSide,
        depthWrite: false,
      }),
    );
    this.backgroundScene.add(this.sky);
    const floorMat = surface(ground, index);
    this.ground = new T.Mesh(new T.PlaneGeometry(4000, 4000), floorMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = index === 2 ? -100 : -0.24;
    this.scene.add(this.ground);
    this.buildLevel();
    const sc = document.createElement("canvas");
    sc.width = 128;
    sc.height = 128;
    const sx = sc.getContext("2d")!;
    const gradient = sx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, "#000000aa");
    gradient.addColorStop(1, "#00000000");
    sx.fillStyle = gradient;
    sx.fillRect(0, 0, 128, 128);
    const shadowTexture = new T.CanvasTexture(sc);
    const colors = ["#42dcff", "#ff5177", "#ffc34a", "#8f8bff"];
    for (let i = 0; i < 4; i++) {
      const bike = makeBike(colors[i]);
      this.bikes.push(bike);
      this.scene.add(bike.group);
      const ribbon = new Ribbon(colors[i]);
      this.ribbons.push(ribbon);
      this.scene.add(ribbon.mesh);
      const shadow = new T.Mesh(
        new T.PlaneGeometry(3, 5),
        new T.MeshBasicMaterial({
          map: shadowTexture,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        }),
      );
      shadow.rotation.x = -Math.PI / 2;
      this.shadows.push(shadow);
      this.scene.add(shadow);
      const pg = new T.BufferGeometry();
      pg.setAttribute(
        "position",
        new T.BufferAttribute(new Float32Array(210 * 3), 3),
      );
      const sparks = new T.Points(
        pg,
        new T.PointsMaterial({
          color: colors[i],
          size: 0.65,
          transparent: true,
          opacity: 1,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sparks.frustumCulled = false;
      this.particles.push(sparks);
      this.scene.add(sparks);
    }
    this.particleSeeds = Float32Array.from({ length: 210 * 3 }, () =>
      this.rnd(),
    );
    this.ready = this.loadEnvironment();
  }
  private async loadEnvironment() {
    // Native World Labs imagery supplies the distant sky and material reflections.
    const assets = import.meta.glob("../public/worlds/*/panorama.jpg", {
      eager: true,
      query: "?url",
      import: "default",
    });
    const url = assets[
      `../public/worlds/${WORLDS[this.index].id}/panorama.jpg`
    ] as string | undefined;
    if (!url) return;
    const texture = await new T.TextureLoader().loadAsync(url);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 8;
    (this.sky.material as T.Material).dispose();
    this.sky.material = new T.MeshBasicMaterial({
      map: texture,
      side: T.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky.scale.x = -1;
    this.sky.rotation.y = -Math.PI / 2;
    if (this.index === 2) this.ground.visible = false;
    const tile = document.createElement("canvas");
    tile.width = 1024;
    tile.height = 1024;
    const tileContext = tile.getContext("2d")!;
    const source = texture.image;
    tileContext.drawImage(
      source,
      source.width * 0.37,
      source.height * 0.75,
      source.width * 0.13,
      source.height * 0.24,
      0,
      0,
      1024,
      1024,
    );
    const detail = new T.CanvasTexture(tile);
    detail.colorSpace = T.SRGBColorSpace;
    detail.wrapS = detail.wrapT = T.RepeatWrapping;
    detail.repeat.set(3, 8);
    detail.anisotropy = 8;
    const rockCanvas = document.createElement("canvas");
    rockCanvas.width = 1024;
    rockCanvas.height = 1024;
    rockCanvas
      .getContext("2d")!
      .drawImage(
        source,
        source.width * 0.15,
        source.height * 0.25,
        source.width * 0.18,
        source.height * 0.36,
        0,
        0,
        1024,
        1024,
      );
    const rockTexture = new T.CanvasTexture(rockCanvas);
    rockTexture.colorSpace = T.SRGBColorSpace;
    rockTexture.anisotropy = 8;
    this.scene.traverse((object) => {
      if (
        object instanceof T.Mesh &&
        object.name === "rock-obstacle" &&
        object.material instanceof T.MeshStandardMaterial
      ) {
        object.material.map = rockTexture;
        object.material.color.set("#ffffff");
        object.material.needsUpdate = true;
      }
      if (
        object instanceof T.Mesh &&
        object.material instanceof T.MeshStandardMaterial &&
        object.material.customProgramCacheKey().startsWith("world-surface")
      ) {
        if (this.index !== 2) {
          object.material.map = detail;
          object.material.color.set(this.index === 1 ? "#dfd2c1" : "#a3b1bb");
        } else {
          object.material.bumpMap = detail;
          object.material.bumpScale = 0.08;
          object.material.color.set("#b5d4dd");
        }
        object.material.needsUpdate = true;
      }
    });
    const environment = texture.clone();
    environment.mapping = T.EquirectangularReflectionMapping;
    environment.needsUpdate = true;
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.65;
    await this.loadWorldGeometry();
    this.environmentReady = true;
  }
  private async loadWorldGeometry() {
    const sources = import.meta.glob("../public/worlds/*/scene*.spz", {
      eager: true,
      query: "?url",
      import: "default",
    });
    const meta = import.meta.glob("../public/worlds/*/world.json", {
      eager: true,
      import: "default",
    });
    const filename = this.offline ? "scene-full.spz" : "scene.spz";
    const url = sources[
      `../public/worlds/${WORLDS[this.index].id}/${filename}`
    ] as string;
    const world = meta[
      `../public/worlds/${WORLDS[this.index].id}/world.json`
    ] as {
      assets: {
        splats: {
          semantics_metadata: {
            metric_scale_factor: number;
            ground_plane_offset: number;
          };
        };
      };
    };
    if (!url || !world)
      throw new Error(
        "World Labs assets are missing for " + WORLDS[this.index].name,
      );
    const splat = new SplatMesh({ url, lod: false, nonLod: true });
    await splat.initialized;
    const semantics = world.assets.splats.semantics_metadata;
    splat.rotation.x = Math.PI;
    splat.scale.setScalar(semantics.metric_scale_factor);
    splat.position.y = semantics.ground_plane_offset;
    this.splat = splat;
    this.backgroundScene.add(splat);
  }
  point(progress: number) {
    return vec(filmPosition(this.index, clamp(progress, 0, 25)));
  }
  private road(a: V3, b: V3, width: number, color: string) {
    const group = new T.Group(),
      pa = vec(a),
      pb = vec(b),
      len = pa.distanceTo(pb);
    group.position.copy(pa).add(pb).multiplyScalar(0.5);
    group.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]);
    const ice = this.index === 2;
    box(
      group,
      surface(color, this.index),
      0,
      ice ? -2 : -0.18,
      0,
      width,
      ice ? 4 : 0.36,
      len,
    );
    if (ice) {
      for (const side of [-1, 1])
        box(
          group,
          material("#b8e5e6"),
          side * (width / 2 - 0.15),
          0.05,
          0,
          0.3,
          0.1,
          len,
        );
    } else {
      for (const side of [-1, 1])
        box(
          group,
          material("#9aaeb5"),
          side * (width / 2 - 0.8),
          0.05,
          0,
          0.13,
          0.02,
          len,
        );
      for (let z = -len / 2 + 3; z < len / 2; z += 10)
        box(group, material("#b4b6ad"), 0, 0.05, z, 0.14, 0.02, 4);
    }
    this.scene.add(group);
  }
  private sign(text: string, p: V3, color: string, width = 14) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 192;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#10191e";
    ctx.fillRect(0, 0, 1024, 192);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 10, 192);
    ctx.font = "600 64px Showcase, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 119);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(
      new T.PlaneGeometry(width, (width * 192) / 1024),
      new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }),
    );
    mesh.position.set(...p);
    this.scene.add(mesh);
    return mesh;
  }
  private buildLevel() {
    const index = this.index,
      level = LEVELS[index];
    for (const r of level.roads)
      this.road(r.a, r.b, r.width, index === 2 ? "#9fbfc9" : "#394550");
    if (index === 0) this.buildCity();
    if (index === 1) this.buildDesert();
    if (index === 2) this.buildIce();
    if (index === 3) this.buildArena();
    for (const h of level.hazards) {
      if (h.kind === "rock") {
        const rock = new T.Mesh(
          new T.DodecahedronGeometry(h.radius, 1),
          new T.MeshStandardMaterial({ color: "#9d7555", roughness: 1 }),
        );
        rock.name = "rock-obstacle";
        rock.position.set(h.x, h.radius * 0.3, h.z);
        rock.scale.y = 1.5;
        this.scene.add(rock);
      } else {
        box(
          this.scene,
          material("#657179"),
          h.x,
          1.2,
          h.z,
          h.radius * 2,
          2.4,
          2,
        );
        for (let x = -h.radius; x < h.radius; x += 2) {
          const stripe = box(
            this.scene,
            material("#d9a253"),
            h.x + x,
            1.3,
            h.z + 1.05,
            0.65,
            1.8,
            0.04,
          );
          stripe.rotation.z = -0.35;
        }
      }
    }
    level.checkpoints.forEach((p, i) => {
      const group = new T.Group();
      group.position.set(...p);
      const ring = new T.Mesh(
        new T.TorusGeometry(index === 1 ? 8 : 5, 0.085, 6, 48),
        material(WORLDS[index].color, true),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.16;
      group.add(ring);
      for (const side of [-1, 1]) {
        box(group, material("#5a6c74"), side * 7, 1.7, 0, 0.22, 3.4, 0.22);
        box(
          group,
          material(WORLDS[index].color, true),
          side * 7,
          3.6,
          0,
          0.24,
          0.8,
          0.24,
        );
      }
      this.checkpoints.push(group);
      this.scene.add(group);
      if (i === level.checkpoints.length - 1) {
        this.sign("EXTRACTION", [p[0], p[1] + 9, p[2]], "#d0eee9", 20);
        box(
          this.scene,
          material("#75878a"),
          p[0] - 12,
          p[1] + 4,
          p[2],
          0.7,
          8,
          0.7,
        );
        box(
          this.scene,
          material("#75878a"),
          p[0] + 12,
          p[1] + 4,
          p[2],
          0.7,
          8,
          0.7,
        );
      }
    });
  }
  private buildCity() {
    this.sign("SERVICE ROUTE  →", [-150, 7, -18], "#c2e6f0", 20);
    const s = this.sign("←  EXTRACTION", [0, 7, 41], "#c2e6f0", 19);
    s.rotation.y = -Math.PI / 2;
    for (let i = 0; i < 2; i++) {
      const drone = new T.Group();
      box(drone, material("#677b88"), 0, 0, 0, 2, 0.6, 3);
      for (const side of [-1, 1]) {
        box(drone, material("#1f2c32"), side * 2.3, 0, 0, 2, 0.25, 2);
        const lens = new T.Mesh(
          new T.SphereGeometry(0.25, 12, 8),
          material("#f59b83", true),
        );
        lens.position.set(side * 0.8, -0.4, 1.1);
        drone.add(lens);
      }
      this.drones.push(drone);
      this.scene.add(drone);
    }
  }
  private buildDesert() {
    const route = LEVELS[1].route;
    for (let i = 0; i < 150; i++) {
      const t = (i / 149) * 24.9,
        p = filmPosition(1, t),
        q = filmPosition(1, t + 0.05);
      const tangent = vec(q).sub(vec(p)).normalize(),
        normal = new T.Vector3(tangent.z, 0, -tangent.x);
      for (const side of [-1, 1]) {
        const marker = vec(p).addScaledVector(normal, side * 40);
        box(
          this.scene,
          material("#5c6664"),
          marker.x,
          0.5,
          marker.z,
          0.3,
          1,
          0.3,
        );
        box(
          this.scene,
          material("#ead4b7"),
          marker.x,
          1.1,
          marker.z,
          0.36,
          0.22,
          0.36,
        );
      }
    }
    for (const door of LEVELS[1].doors) {
      const frame = new T.Group();
      frame.position.z = door.z;
      for (const side of [-1, 1])
        box(frame, material("#635f59"), side * 40, 10, 0, 10, 20, 8);
      box(frame, material("#696960"), 0, 20, 0, 90, 4, 9);
      const slab = new T.Group();
      box(slab, material("#6e746f"), 0, 6, 0, 72, 12, 3);
      for (let x = -34; x <= 34; x += 4)
        box(slab, material("#a69e84"), x, 6, 1.6, 0.2, 11, 0.15);
      box(slab, material("#eca674", true), 0, 0.3, 1.6, 72, 0.4, 0.1);
      frame.add(slab);
      this.doors.push(slab);
      this.scene.add(frame);
      this.sign("SECURITY SHUTTER", [0, 24, door.z], "#f5d4aa", 30);
    }
    for (let i = 0; i < route.length - 1; i++) {
      const p = route[i];
      for (const side of [-1, 1])
        box(
          this.scene,
          material("#d5c2a6"),
          p[1] + side * 35,
          1.5,
          p[3],
          0.3,
          3,
          0.3,
        );
    }
  }
  private buildIce() {
    const support = material("#4d6674");
    for (const road of LEVELS[2].roads) {
      const a = vec(road.a),
        b = vec(road.b),
        tangent = b.clone().sub(a).normalize(),
        normal = new T.Vector3(tangent.z, 0, -tangent.x);
      const spans = Math.max(1, Math.floor(a.distanceTo(b) / 20));
      for (let j = 0; j < spans; j++) {
        const p = a.clone().lerp(b, (j + 0.5) / spans);
        p.y -= 6;
        for (const side of [-1, 1]) {
          const end = p
            .clone()
            .addScaledVector(normal, side * (road.width / 2 - 0.6));
          segment(
            this.scene,
            support,
            end.clone().addScaledVector(tangent, -8),
            end
              .clone()
              .addScaledVector(tangent, 8)
              .add(new T.Vector3(0, -6, 0)),
            0.35,
          );
          segment(
            this.scene,
            support,
            end.clone().addScaledVector(tangent, 8),
            end
              .clone()
              .addScaledVector(tangent, -8)
              .add(new T.Vector3(0, -6, 0)),
            0.35,
          );
        }
      }
    }
    for (const [x, z, width] of [
      [-90, 45, 18],
      [50, -144, 20],
    ]) {
      for (let i = 0; i < 6; i++) {
        const mark = box(
          this.scene,
          material("#e6c67e"),
          x,
          12.09,
          z + i * 2.5,
          width,
          0.04,
          0.8,
        );
        mark.rotation.y = 0;
      }
      this.sign(
        z > 0 ? "JUMP  /  36 m" : "BOOST + JUMP  /  58 m",
        [x, 20, z + 8],
        "#deeced",
        22,
      );
    }
  }
  private buildArena() {
    const floor = new T.Mesh(
      new T.PlaneGeometry(270, 270),
      surface("#515c66", 3),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    this.scene.add(floor);
    const grid = new T.GridHelper(270, 18, "#697c82", "#47545b");
    grid.position.y = 0.04;
    this.scene.add(grid);
    for (const side of [-1, 1]) {
      box(this.scene, material("#6a7b83"), side * 137, 2, 0, 4, 4, 278);
      box(this.scene, material("#6a7b83"), 0, 2, side * 137, 278, 4, 4);
      box(
        this.scene,
        material("#c8b9e4", true),
        side * 135,
        3,
        0,
        0.12,
        0.1,
        270,
      );
      box(
        this.scene,
        material("#c8b9e4", true),
        0,
        3,
        side * 135,
        270,
        0.1,
        0.12,
      );
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU,
        x = Math.sin(a) * 200,
        z = Math.cos(a) * 200;
      box(this.scene, material("#3a454e"), x, 40, z, 12, 80, 12);
      box(this.scene, material("#a7b9d9", true), x, 40, z, 1, 70, 12.1);
    }
  }
  update(
    time: number,
    chapter: number,
    grid: boolean,
    game?: GameState,
  ): Telemetry {
    const idx = this.index,
      t = game?.time ?? clamp(chapter, 0, 25),
      level = LEVELS[idx];
    const p = game ? vec(game.riders[0].p) : vec(filmPosition(idx, t));
    const prev = vec(filmPosition(idx, Math.max(0, t - 0.06))),
      next = vec(filmPosition(idx, Math.min(24.99, t + 0.06)));
    let direction = next.clone().sub(prev).normalize();
    if (direction.lengthSq() < 0.1) direction.set(0, 0, -1);
    if (game)
      direction.set(
        Math.sin(game.riders[0].heading),
        0,
        Math.cos(game.riders[0].heading),
      );
    const normal = new T.Vector3(direction.z, 0, -direction.x).normalize();
    const boost = game?.boost ?? (idx === 1 && t > 13 && t < 22);
    const airborne = p.y > (idx === 2 ? 12 : 0) + 0.4;
    const turning =
      !game && idx === 0 && level.route.some((k) => Math.abs(k[0] - t) < 0.5);
    let alive = 0;
    for (let i = 0; i < 4; i++) {
      const rider = game?.riders[i],
        active = !!rider || (!game && (idx === 3 || i === 0));
      const died = game
        ? (rider?.diedAt ?? -1)
        : idx === 3
          ? REPLAY_DEATHS[i]
          : Infinity;
      const dead = game ? !!rider && !rider.alive : t >= died;
      const bike = this.bikes[i];
      bike.group.visible = active && !dead;
      this.shadows[i].visible = active && !dead;
      if (active && !dead) alive++;
      const bikeTime = dead ? Math.min(t, died) : t;
      const bp = rider ? vec(rider.p) : vec(filmPosition(idx, bikeTime, i));
      const bt = rider
        ? new T.Vector3(Math.sin(rider.heading), 0, Math.cos(rider.heading))
        : vec(filmPosition(idx, Math.min(25, bikeTime + 0.035), i))
            .sub(vec(filmPosition(idx, Math.max(0, bikeTime - 0.035), i)))
            .normalize();
      if (bt.lengthSq() < 0.1) bt.set(0, 0, -1);
      bike.group.position.copy(bp);
      bike.group.rotation.set(
        -Math.asin(clamp(bt.y, -1, 1)),
        Math.atan2(bt.x, bt.z),
        game && i === 0 ? (game.drift ? -0.12 : 0) : turning ? 0.22 : 0,
        "YXZ",
      );
      bike.exhaust.scale.z = boost && i === 0 ? 4 : 1;
      bike.wheels.forEach((w) => (w.rotation.x = -t * 60));
      this.shadows[i].visible =
        active && !dead && surfaceAt(idx, bp.x, bp.z) !== null;
      (this.shadows[i].material as T.MeshBasicMaterial).opacity =
        0.65 / (1 + Math.max(0, bp.y - 12) * 0.2);
      this.shadows[i].position.set(bp.x, idx === 2 ? 12.12 : 0.1, bp.z);
      this.shadows[i].rotation.z = -Math.atan2(bt.x, bt.z);
      let points: V3[] = [];
      if (active) {
        if (rider) points = rider.trail.map((p) => p.p);
        else {
          const from = idx === 3 ? 0 : Math.max(0, bikeTime - 2.6),
            end = Math.max(from, bikeTime - 0.035);
          for (let s = from; s < end; s += 1 / 60)
            points.push(filmPosition(idx, s, i));
          points.push(filmPosition(idx, end, i));
        }
      }
      this.ribbons[i].update(
        points,
        dead ? Math.max(0, 1 - (t - died) / 1.2) : 1,
      );
      const age = t - died,
        particles = this.particles[i];
      particles.visible = active && dead && age >= 0 && age < 2;
      if (particles.visible) {
        const pos = particles.geometry.attributes.position
          .array as Float32Array;
        for (let j = 0; j < 210; j++) {
          const a = this.particleSeeds[j * 3] - 0.5,
            b = this.particleSeeds[j * 3 + 1],
            c = this.particleSeeds[j * 3 + 2] - 0.5;
          pos.set(
            [
              bp.x + a * age * 38,
              bp.y + 1 + b * age * 20 - age * age * 6,
              bp.z + c * age * 38,
            ],
            j * 3,
          );
        }
        particles.geometry.attributes.position.needsUpdate = true;
        (particles.material as T.PointsMaterial).opacity = 1 - age / 2;
      }
    }
    this.drones.forEach((drone, i) => {
      const dp = game
        ? p.clone().addScaledVector(direction, -20 - i * 9)
        : vec(filmPosition(0, Math.max(0, t - 1 - i * 0.5)));
      dp.y += 7 + i * 3;
      dp.addScaledVector(normal, (i ? 1 : -1) * 7);
      drone.position.copy(dp);
      drone.rotation.y = Math.atan2(direction.x, direction.z);
    });
    this.doors.forEach((slab, i) => {
      const timer = game ? game.doorTimers[i] : level.doors[i].closes - t;
      slab.position.y = timer < 0 && game ? 14 : clamp(timer / 1.6) * 14;
    });
    this.checkpoints.forEach((cp, i) => {
      const done = game
        ? i < game.checkpoint
        : t > level.route[Math.min(i + 1, level.route.length - 1)][0];
      cp.visible = !done;
    });
    const chase = p
      .clone()
      .addScaledVector(direction, -16)
      .addScaledVector(normal, 5);
    chase.y += 6;
    const target = p.clone().addScaledVector(direction, 10);
    target.y += 1.6;
    const side = p
      .clone()
      .addScaledVector(normal, idx === 1 ? -26 : -21)
      .addScaledVector(direction, -4);
    side.y += 7;
    let eye = chase,
      look = target;
    if (!game) {
      if (idx === 0) {
        const wide = grid ? 0.48 : 1 - smooth((t - 0.3) / 3);
        eye = chase
          .clone()
          .lerp(p.clone().add(new T.Vector3(-25, 22, 25)), wide);
        if (turning) {
          eye = p.clone().add(new T.Vector3(-24, 31, 24));
          look = p.clone();
        }
      }
      if (idx === 1) {
        const sideMix = grid
          ? 0.55
          : smooth((t - 3) / 2) * (1 - smooth((t - 10) / 2));
        eye = chase.clone().lerp(side, sideMix);
        if (t > 14 && t < 21.5) {
          eye = p.clone().add(new T.Vector3(-16, 9, 21));
          look = p.clone().add(new T.Vector3(0, 1, -40));
        }
      }
      if (idx === 2) {
        const jumping = ICE_JUMPS.some(([a, b]) => t > a - 1.4 && t < b + 0.6);
        if (grid || jumping) {
          eye = p.clone().add(new T.Vector3(-28, 8, 19));
          look = p.clone().add(new T.Vector3(0, -1, -10));
        } else {
          eye = p.clone().add(new T.Vector3(-12, 11, 20));
        }
      }
      if (idx === 3) {
        // Oblique tactical framing keeps all walls and each interception readable.
        eye = new T.Vector3(0, 190, 150);
        look = new T.Vector3(0, 0, 0);
        if (!grid) {
          const impact = REPLAY_DEATHS.slice(1).find(
            (d) => t > d - 1.8 && t < d + 1.8,
          );
          if (impact) {
            const rival = REPLAY_DEATHS.indexOf(impact),
              hit = vec(filmPosition(3, impact, rival));
            const focus =
              smooth((t - (impact - 1.8)) / 0.7) *
              (1 - smooth((t - (impact + 0.9)) / 0.9));
            eye.lerp(hit.clone().add(new T.Vector3(-30, 60, 50)), focus * 0.65);
            look.lerp(hit, focus * 0.8);
          }
        }
      }
    }
    if (idx === 0 && !game && turning) {
      eye = p.clone().add(new T.Vector3(-18, 14, 18));
      look = p.clone().add(new T.Vector3(0, 1, 0));
    }
    if (idx === 3 && !game) {
      if (t < 3.4) {
        eye = p
          .clone()
          .addScaledVector(direction, -20)
          .addScaledVector(normal, -12);
        eye.y += 10;
        look = p.clone().addScaledVector(direction, 24);
      } else if (t > 6.8 && t < 8.8) {
        eye = p
          .clone()
          .addScaledVector(direction, -18)
          .addScaledVector(normal, 10);
        eye.y += 9;
        look = p.clone().addScaledVector(direction, 12);
      } else if (t > 12.4 && t < 17) {
        eye = p
          .clone()
          .addScaledVector(direction, -19)
          .addScaledVector(normal, -10);
        eye.y += 12;
        look = p.clone().addScaledVector(direction, 14);
      } else if (t > 22.7) {
        eye = p
          .clone()
          .addScaledVector(direction, -14)
          .addScaledVector(normal, -14);
        eye.y += 5;
        look = p.clone().add(new T.Vector3(0, 1, 0));
      }
    }
    this.camera.position.copy(eye);
    this.camera.lookAt(look);
    this.camera.fov = idx === 3 && !game ? 64 : boost ? 65 : 56;
    this.camera.updateProjectionMatrix();
    // Stage the generated 3D surroundings near their well-reconstructed origin.
    // The authored course renders in a separate pass, with its own collision geometry.
    const parallax = idx === 3 ? 0.0006 : 0.002;
    this.backgroundCamera.copy(this.camera);
    this.backgroundCamera.near = 0.01;
    this.backgroundCamera.position.set(
      (this.camera.position.x - level.spawn[0]) * parallax,
      (this.splat?.position.y ?? 0) + this.camera.position.y * parallax,
      (this.camera.position.z - level.spawn[2]) * parallax,
    );
    this.backgroundCamera.updateProjectionMatrix();
    this.sky.position.copy(this.backgroundCamera.position);
    const beat = filmBeat(idx, t);
    this.telemetry = {
      speed: game
        ? game.riders[0].speed * 3.6
        : (prev.distanceTo(next) / 0.12) * 3.6,
      boost,
      drift: game?.drift ?? turning,
      airborne,
      combat: idx === 3 && alive < 4,
      position: p,
      progress: t / 25,
      label: game
        ? game.status === "ready"
          ? "READY TO RIDE"
          : game.status === "lost"
            ? "RIDER DEREZZED"
            : game.status === "won"
              ? "MISSION COMPLETE"
              : LEVELS[idx].objective
        : beat.label,
      detail: game
        ? game.status === "running"
          ? idx === 3
            ? "Make your own route. Every light wall is lethal."
            : `Checkpoint ${Math.min(game.checkpoint + 1, level.checkpoints.length)} of ${level.checkpoints.length}`
          : game.reason
        : beat.detail,
      metric: game
        ? `${Math.max(0, level.limit - game.time).toFixed(1)} s  /  ${game.score} PTS`
        : beat.metric,
      alive,
      energy: game?.energy ?? 100,
      status: game?.status ?? "film",
      chapter: t,
    };
    if (game?.status === "running" && idx === 1) {
      const gate = level.doors.findIndex(
        (d, i) => p.z > d.z && game.doorTimers[i] >= 0,
      );
      if (gate >= 0) {
        this.telemetry.label = "SHUTTER CLOSING · BOOST";
        this.telemetry.detail = `${game.doorTimers[gate].toFixed(1)} seconds to clear shutter ${gate + 1}`;
      }
    }
    return this.telemetry;
  }
  dispose() {
    this.splat?.removeFromParent();
    this.splat?.dispose();
    this.spark.removeFromParent();
    this.spark.dispose();
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>(),
      textures = new Set<T.Texture>();
    for (const scene of [this.scene, this.backgroundScene])
      scene.traverse((o) => {
        if (
          o instanceof T.Mesh ||
          o instanceof T.Points ||
          o instanceof T.Line
        ) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            materials.add(m);
            for (const v of Object.values(m))
              if (v instanceof T.Texture) textures.add(v);
          }
        }
      });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.scene.environment?.dispose();
  }
}
