import * as T from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { World, type RideInput } from "./World";
import { WORLDS, DURATION, frameAt, smooth, formatTime } from "./timeline";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const FONT = "Showcase, sans-serif";
const MONO = "Telemetry, monospace";

export class Director {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  renderer: T.WebGLRenderer;
  composer: EffectComposer;
  renderPass: RenderPass;
  backgroundPass: RenderPass;
  bloom: UnrealBloomPass;
  antialias: ShaderPass;
  worlds: World[];
  width: number;
  height: number;
  ready: Promise<void>;
  private renderWidth = 0;
  private renderHeight = 0;
  private offline: boolean;
  private pixels = new Uint16Array(0);
  private halfToByte = Uint8ClampedArray.from({ length: 65536 }, (_, value) =>
    Math.round(T.DataUtils.fromHalfFloat(value) * 255),
  );
  private pixelImage: ImageData | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    width = 1600,
    height = 900,
    offline = false,
  ) {
    this.offline = offline;
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;
    this.ctx = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: offline,
    })!;
    this.renderer = new T.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.worlds = WORLDS.map((_, i) => new World(i, this.renderer, offline));
    this.ready = Promise.all(this.worlds.map((w) => w.ready)).then(() => {});
    this.composer = new EffectComposer(this.renderer);
    this.composer.renderToScreen = !offline;
    this.renderPass = new RenderPass(
      this.worlds[0].scene,
      this.worlds[0].camera,
    );
    this.backgroundPass = new RenderPass(
      this.worlds[0].backgroundScene,
      this.worlds[0].backgroundCamera,
    );
    this.composer.addPass(this.backgroundPass);
    this.renderPass.clear = false;
    this.renderPass.clearDepth = true;
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(
      new T.Vector2(width, height),
      0.3,
      0.4,
      1.2,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.antialias = new ShaderPass(FXAAShader);
    this.composer.addPass(this.antialias);
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private text(
    text: string,
    x: number,
    y: number,
    size: number,
    color = "#f0f4f4",
    weight = 400,
    mono = false,
  ) {
    const ctx = this.ctx;
    ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
  private line(x: number, y: number, width: number, color = "#ffffff26") {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, 1);
  }
  private pill(text: string, x: number, y: number, color: string) {
    const ctx = this.ctx;
    ctx.font = `15px ${MONO}`;
    const width = ctx.measureText(text).width + 32;
    ctx.fillStyle = "#080e16b8";
    ctx.beginPath();
    ctx.roundRect(x, y, width, 34, 5);
    ctx.fill();
    ctx.strokeStyle = color + "66";
    ctx.lineWidth = 1;
    ctx.stroke();
    this.text(text, x + 16, y + 23, 15, color, 400, true);
  }

  async prepare(time: number) {
    const state = frameAt(time);
    for (let i = 0; i < 4; i++) {
      const active = i === state.active;
      if (!active && state.zoom >= 0.999) continue;
      const chapter = active ? state.chapterTime : Math.min(time, 2);
      const world = this.worlds[i];
      world.update(time, chapter, !active || state.zoom < 0.15);
      const zoom = active ? state.zoom : 0;
      const width = Math.max(
        2,
        Math.round(((893 + (1920 - 893) * zoom) * this.width) / 1920),
      );
      const height = Math.max(
        2,
        Math.round(((368 + (1080 - 368) * zoom) * this.height) / 1080),
      );
      world.camera.aspect = width / height;
      world.camera.updateProjectionMatrix();
      world.backgroundCamera.aspect = world.camera.aspect;
      world.backgroundCamera.updateProjectionMatrix();
      await world.spark.update({
        scene: world.backgroundScene,
        camera: world.backgroundCamera,
      });
    }
  }
  render(time: number, manualWorld = -1, ride?: RideInput) {
    if (this.renderer.getContext().isContextLost())
      throw new Error(
        "The WebGL context was lost. Reload the page or select another capture backend.",
      );
    const state = frameAt(time);
    if (manualWorld >= 0) {
      state.active = manualWorld;
      state.zoom = 1;
      state.chapterTime = ride ? 6 : Math.min(25, time);
      state.closing = false;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.width / 1920, this.height / 1080);
    ctx.fillStyle = "#080d14";
    ctx.fillRect(0, 0, 1920, 1080);
    const opacity = 1 - smooth(state.zoom * 1.7);
    ctx.globalAlpha = opacity;
    this.text("T R O N  /  W O R L D S", 58, 53, 18, "#d5e4e4", 800);
    ctx.textAlign = "right";
    this.text(
      this.worlds.every((w) => w.environmentReady)
        ? `WORLD LABS ENVIRONMENTS    /    ${formatTime(DURATION)}`
        : "ENVIRONMENTS GENERATING    /    PREVIEW",
      1862,
      53,
      14,
      "#87979f",
      400,
      true,
    );
    ctx.textAlign = "left";
    this.line(58, 78, 1804);
    this.text(
      state.closing
        ? "Every world. A new way to ride."
        : "Four worlds. One rider.",
      54,
      155,
      62,
      "#f0f5f4",
      800,
    );
    ctx.textAlign = "right";
    this.text(
      state.closing ? "THE GRID IS YOURS." : "FIND YOUR NEXT FRONTIER.",
      1860,
      151,
      15,
      "#9bacae",
      400,
      true,
    );
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
    const tiles: Rect[] = [0, 1, 2, 3].map((i) => ({
      x: 58 + (i % 2) * 911,
      y: 202 + Math.floor(i / 2) * 386,
      w: 893,
      h: 368,
    }));
    const order = [0, 1, 2, 3].filter((i) => i !== state.active);
    if (state.active >= 0) order.push(state.active);
    for (const i of order) {
      const active = i === state.active;
      if (!active && state.zoom >= 0.999) continue;
      const z = active ? state.zoom : 0;
      const tile = tiles[i];
      const rect = {
        x: tile.x * (1 - z),
        y: tile.y * (1 - z),
        w: tile.w + (1920 - tile.w) * z,
        h: tile.h + (1080 - tile.h) * z,
      };
      const world = this.worlds[i];
      world.update(
        time,
        active ? state.chapterTime : Math.min(time, 2),
        !active || z < 0.15,
        active ? ride : undefined,
      );
      const rw = Math.max(2, Math.round((rect.w * this.width) / 1920));
      const rh = Math.max(2, Math.round((rect.h * this.height) / 1080));
      if (rw !== this.renderWidth || rh !== this.renderHeight) {
        this.renderer.setSize(rw, rh, false);
        this.composer.setSize(rw, rh);
        this.antialias.uniforms.resolution.value.set(1 / rw, 1 / rh);
        this.renderWidth = rw;
        this.renderHeight = rh;
      }
      world.camera.aspect = rw / rh;
      world.camera.updateProjectionMatrix();
      world.backgroundCamera.aspect = rw / rh;
      world.backgroundCamera.updateProjectionMatrix();
      this.backgroundPass.scene = world.backgroundScene;
      this.backgroundPass.camera = world.backgroundCamera;
      this.renderPass.scene = world.scene;
      this.renderPass.camera = world.camera;
      this.bloom.strength = world.telemetry.boost ? 0.36 : 0.27;
      this.composer.render(1 / 30);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 10 * (1 - z));
      ctx.clip();
      if (this.offline) {
        // Direct readback avoids driver-specific GPU-canvas copy failures in headless Chrome.
        if (
          !this.pixelImage ||
          this.pixelImage.width !== rw ||
          this.pixelImage.height !== rh
        ) {
          this.pixels = new Uint16Array(rw * rh * 4);
          this.pixelImage = new ImageData(rw, rh);
        }
        this.renderer.readRenderTargetPixels(
          this.composer.readBuffer,
          0,
          0,
          rw,
          rh,
          this.pixels,
        );
        const stride = rw * 4;
        for (let row = 0; row < rh; row++) {
          const source = row * stride,
            destination = (rh - row - 1) * stride;
          for (let col = 0; col < stride; col++)
            this.pixelImage.data[destination + col] =
              this.halfToByte[this.pixels[source + col]];
        }
        ctx.putImageData(
          this.pixelImage,
          Math.round((rect.x * this.width) / 1920),
          Math.round((rect.y * this.height) / 1080),
        );
      } else
        ctx.drawImage(this.renderer.domElement, rect.x, rect.y, rect.w, rect.h);
      const shade = ctx.createLinearGradient(
        0,
        rect.y + rect.h * 0.55,
        0,
        rect.y + rect.h,
      );
      shade.addColorStop(0, "#02091200");
      shade.addColorStop(1, z > 0.5 ? "#020912d9" : "#020912cc");
      ctx.fillStyle = shade;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      const upper = ctx.createLinearGradient(0, rect.y, 0, rect.y + 180);
      upper.addColorStop(0, "#040914a0");
      upper.addColorStop(1, "#04091400");
      ctx.fillStyle = upper;
      ctx.fillRect(rect.x, rect.y, rect.w, 180);
      ctx.globalAlpha = 1 - smooth(z * 1.6);
      this.pill(
        WORLDS[i].label +
          " / " +
          ["CITY PURSUIT", "CANYON ESCAPE", "BROKEN BRIDGES", "SURVIVAL ARENA"][
            i
          ],
        rect.x + 24,
        rect.y + 22,
        WORLDS[i].color,
      );
      this.text(
        WORLDS[i].name,
        rect.x + 26,
        rect.y + rect.h - 57,
        34,
        "#f1f5f5",
        800,
      );
      this.text(
        WORLDS[i].mechanic.toUpperCase(),
        rect.x + 27,
        rect.y + rect.h - 28,
        14,
        WORLDS[i].color,
        400,
        true,
      );
      ctx.textAlign = "right";
      this.text(
        "↗",
        rect.x + rect.w - 28,
        rect.y + rect.h - 35,
        32,
        WORLDS[i].color,
      );
      ctx.textAlign = "left";
      ctx.restore();
      if (active && z > 0.3) {
        ctx.globalAlpha = smooth((z - 0.3) / 0.7);
        this.drawHUD(i, time, state.chapterTime, !!ride);
        ctx.globalAlpha = 1;
      }
    }
    if (state.zoom < 0.01) {
      ctx.fillStyle = "#8ee6d3";
      ctx.beginPath();
      ctx.arc(65, 1007, 4, 0, Math.PI * 2);
      ctx.fill();
      this.text(
        state.closing
          ? "FOUR ENVIRONMENTS. FOUR WAYS TO PLAY."
          : "DRIFT  /  BOOST  /  JUMP  /  OUTMANEUVER",
        81,
        1012,
        14,
        "#a2b5b9",
        400,
        true,
      );
      ctx.textAlign = "right";
      this.text(
        "LIGHTCYCLE PROTOCOL  /  VOL. 01",
        1862,
        1012,
        14,
        "#8a9ca4",
        400,
        true,
      );
      ctx.textAlign = "left";
    }
    // A quiet chapter rail remains part of the film, separate from app controls.
    const railY = 1054;
    for (let i = 0; i < 4; i++) {
      const x = 58 + i * 455.5;
      ctx.fillStyle = "#d2e7e522";
      ctx.fillRect(x, railY, 437, 2);
      const progress = smooth(
        (time - WORLDS[i].start) / (WORLDS[i].end - WORLDS[i].start),
      );
      ctx.fillStyle = WORLDS[i].color;
      ctx.fillRect(x, railY, 437 * progress, 2);
    }
    ctx.restore();
    return {
      ...state,
      telemetry: state.active >= 0 ? this.worlds[state.active].telemetry : null,
    };
  }

  private drawHUD(
    index: number,
    time: number,
    chapter: number,
    riding: boolean,
  ) {
    const ctx = this.ctx,
      world = WORLDS[index],
      telemetry = this.worlds[index].telemetry;
    this.text("T R O N  /  W O R L D S", 58, 62, 18, "#ecf4f2", 800);
    this.pill(
      `${world.label}  /  ${world.name.toUpperCase()}`,
      58,
      89,
      world.color,
    );
    ctx.textAlign = "right";
    this.text(
      riding ? "LIVE MISSION" : "GAMEPLAY DEMO",
      1860,
      59,
      14,
      "#afc0c6",
      400,
      true,
    );
    this.text(
      riding
        ? "WASD / ARROWS"
        : `${formatTime(time)} / ${formatTime(DURATION)}`,
      1860,
      84,
      13,
      "#8fa4af",
      400,
      true,
    );
    ctx.textAlign = "left";
    this.text(
      this.worlds[index].environmentReady
        ? "WORLD LABS / MARBLE"
        : "BACKGROUND GENERATING",
      58,
      150,
      12,
      "#b9c9d0",
      400,
      true,
    );
    const titleIn = smooth((chapter - 0.2) / 0.8);
    ctx.save();
    ctx.globalAlpha *= titleIn;
    this.text(world.name.toUpperCase(), 61, 869, 15, world.color, 700, true);
    this.text(
      telemetry.label,
      58,
      925,
      telemetry.label.length > 38 ? 28 : 40,
      "#eff7f5",
      800,
    );
    this.text(telemetry.detail, 61, 962, 22, "#c0cdd2");
    this.text(telemetry.metric, 61, 1000, 16, world.color, 600, true);
    ctx.restore();
    this.pill(
      riding
        ? `BOOST ${Math.round(telemetry.energy)}%`
        : telemetry.airborne
          ? "AIRBORNE"
          : telemetry.boost
            ? "BOOST ACTIVE"
            : index === 3
              ? `${telemetry.alive} RIDERS ALIVE`
              : "MISSION IN PROGRESS",
      1484,
      860,
      world.color,
    );
    ctx.textAlign = "right";
    this.text(
      Math.round(telemetry.speed).toString().padStart(3, "0"),
      1790,
      953,
      106,
      "#f2f7f4",
      800,
    );
    this.text("KM/H", 1860, 944, 17, "#9bafb6", 400, true);
    ctx.textAlign = "left";
    const speed = telemetry.speed / 360;
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = i / 30 < speed ? world.color : "#c0d3df22";
      ctx.fillRect(1484 + i * 12.6, 975, 8, 18 + i * 0.27);
    }
    const route = this.worlds[index];
    const samples = Array.from({ length: 101 }, (_, i) =>
      route.point((i / 100) * 25),
    );
    const minX = Math.min(...samples.map((p) => p.x)),
      maxX = Math.max(...samples.map((p) => p.x));
    const minZ = Math.min(...samples.map((p) => p.z)),
      maxZ = Math.max(...samples.map((p) => p.z));
    const scale = Math.min(110 / (maxX - minX || 1), 180 / (maxZ - minZ || 1));
    ctx.save();
    ctx.translate(1770, 215);
    ctx.strokeStyle = "#d4dfeaaa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((p, i) => {
      const x = (p.x - (minX + maxX) / 2) * scale,
        y = (p.z - (minZ + maxZ) / 2) * scale;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    const p = telemetry.position;
    ctx.fillStyle = world.color;
    ctx.beginPath();
    ctx.arc(
      (p.x - (minX + maxX) / 2) * scale,
      (p.z - (minZ + maxZ) / 2) * scale,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  dispose() {
    this.worlds.forEach((world) => world.dispose());
    this.bloom.dispose();
    this.composer.passes.forEach((pass) => {
      if (pass !== this.bloom) pass.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
