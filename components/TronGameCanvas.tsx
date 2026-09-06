import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BikeState, KillEvent, TrailWallSegment, RoadSegmentDef, BuildingFootprint } from '../types';
import { SF_ROAD_SEGMENTS, generateCityBuildings, SF_DISTRICTS } from '../data/SanFranciscoRoadNetwork';
import { createLightcycleMesh, LightcycleVisuals } from '../game/LightcycleMesh';
import { TrailSystem } from '../game/TrailSystem';
import { PhysicsEngine, ControlInput } from '../game/PhysicsEngine';
import { BotAIManager } from '../game/BotAI';
import { buildSanFranciscoCityMesh } from '../game/CityMeshGenerator';
import { soundEngine } from '../game/AudioEngine';
import { CyberHUD } from './CyberHUD';

export const TronGameCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Road and Building data
  const [roads] = useState<RoadSegmentDef[]>(() => SF_ROAD_SEGMENTS);
  const [buildings] = useState<BuildingFootprint[]>(() => generateCityBuildings());

  // Player State
  const [playerState, setPlayerState] = useState<BikeState>({
    id: 'player_local',
    name: 'USER_GRID',
    isLocal: true,
    color: '#00f3ff',
    position: { x: 900, y: 0, z: 200 }, // Start on The Embarcadero
    velocity: { x: 0, y: 0, z: 0 },
    heading: 3.14,
    pitch: 0,
    roll: 0,
    speedKmh: 160,
    nitro: 100,
    isBoosting: false,
    isDrifting: false,
    isBraking: false,
    isAlive: true,
    currentDistrict: 'embarcadero',
    currentStreet: 'The Embarcadero (Ferry Building Plaza Sweep)',
    score: 0,
    kills: 0,
    totalDistanceTraveled: 0,
    timeSurvivedSeconds: 0,
  });

  const [botStates, setBotStates] = useState<BikeState[]>([]);
  const [allTrailSegments, setAllTrailSegments] = useState<TrailWallSegment[]>([]);
  const [killEvents, setKillEvents] = useState<KillEvent[]>([]);

  // Refs for animation loop
  const playerStateRef = useRef<BikeState>(playerState);
  playerStateRef.current = playerState;

  const inputRef = useRef<ControlInput>({
    throttle: 0,
    brake: 0,
    steer: 0,
    boost: false,
    drift: false,
  });

  const keysDown = useRef<Record<string, boolean>>({});
  const respawnTrigger = useRef<boolean>(false);

  // Respawn Handler
  const handleRespawn = useCallback(() => {
    respawnTrigger.current = true;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.FogExp2(0x020617, 0.00035);

    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      8000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 2. Cinematic Post-Processing Bloom Pipeline
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      1.35, // Bloom Strength
      0.45, // Bloom Radius
      0.22  // Bloom Threshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 3. Cyberpunk Colored Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight.position.set(600, 1200, 600);
    scene.add(dirLight);

    const magentaFill = new THREE.DirectionalLight(0xff0055, 1.2);
    magentaFill.position.set(-600, 800, -600);
    scene.add(magentaFill);

    // 4. Build San Francisco City & Roads with Pano Skybox
    buildSanFranciscoCityMesh(scene, roads, buildings);

    // 5. Local Player Lightcycle & Trail
    const playerVisuals: LightcycleVisuals = createLightcycleMesh('#00f3ff');
    scene.add(playerVisuals.group);

    const playerTrail = new TrailSystem(scene, 'player_local', '#00f3ff');

    // 6. Bot AI Manager
    const botManager = new BotAIManager(scene);
    botManager.initBots(5);

    // 7. Keyboard Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      soundEngine.init();
      keysDown.current[e.code] = true;

      if (!playerStateRef.current.isAlive && (e.code === 'Space' || e.code === 'KeyR')) {
        handleRespawn();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // 8. Resize Handler
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      composer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // 9. Main Animation & Physics Loop
    let clock = new THREE.Clock();
    let animationId: number;
    let uiUpdateTimer = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Check Respawn
      if (respawnTrigger.current) {
        respawnTrigger.current = false;
        playerTrail.clear();
        playerStateRef.current = {
          ...playerStateRef.current,
          position: { x: 900, y: 0, z: 200 },
          velocity: { x: 0, y: 0, z: 0 },
          heading: 3.14,
          roll: 0,
          speedKmh: 160,
          nitro: 100,
          isBoosting: false,
          isDrifting: false,
          isBraking: false,
          isAlive: true,
          currentDistrict: 'embarcadero',
          currentStreet: 'The Embarcadero (Ferry Building Plaza Sweep)',
        };
        playerVisuals.group.visible = true;
        botManager.initBots(5);
        setPlayerState({ ...playerStateRef.current });
      }

      // Input Gathering
      const keys = keysDown.current;
      const isThrottle = keys['KeyW'] || keys['ArrowUp'];
      const isBrake = keys['KeyS'] || keys['ArrowDown'];
      const isLeft = keys['KeyA'] || keys['ArrowLeft'];
      const isRight = keys['KeyD'] || keys['ArrowRight'];
      const isBoost = keys['ShiftLeft'] || keys['ShiftRight'];
      const isDrift = keys['Space'];

      let steer = 0;
      if (isLeft) steer += 1.0;
      if (isRight) steer -= 1.0;

      inputRef.current = {
        throttle: isThrottle ? 1.0 : 0.85,
        brake: isBrake ? 1.0 : 0.0,
        steer,
        boost: !!isBoost,
        drift: !!isDrift,
      };

      if (isBoost && playerStateRef.current.nitro > 10) {
        soundEngine.playBoostIgnition();
      }
      if (isDrift && playerStateRef.current.speedKmh > 160) {
        soundEngine.playDriftScreech();
      }

      // Collect all trails
      const currentLocalTrail = playerTrail.getSegments();
      const botTrails = botManager.getAllBotTrails();
      const allTrails = [...currentLocalTrail, ...botTrails];

      // Update Local Player Physics
      const { collided, collisionReason } = PhysicsEngine.updateBikePhysics(
        playerStateRef.current,
        inputRef.current,
        delta,
        roads,
        buildings,
        allTrails
      );

      if (collided && playerStateRef.current.isAlive) {
        playerStateRef.current.isAlive = false;
        playerVisuals.group.visible = false;
        soundEngine.playDerezzedExplosion();

        setKillEvents((prev) => [
          ...prev,
          {
            id: `kill_${Date.now()}`,
            killerName: 'LIGHT RIBBON',
            killerColor: '#ff0055',
            victimName: playerStateRef.current.name,
            victimColor: playerStateRef.current.color,
            reason: collisionReason || 'trail_collision',
            district: SF_DISTRICTS[playerStateRef.current.currentDistrict]?.name || 'San Francisco',
            timestamp: Date.now(),
          },
        ]);
      }

      // Update Player 3D Visual Mesh
      if (playerStateRef.current.isAlive) {
        playerVisuals.group.position.set(
          playerStateRef.current.position.x,
          playerStateRef.current.position.y,
          playerStateRef.current.position.z
        );
        playerVisuals.group.rotation.y = playerStateRef.current.heading;
        playerVisuals.group.rotation.z = playerStateRef.current.roll;

        playerVisuals.updateAnimation(
          delta,
          playerStateRef.current.speedKmh,
          playerStateRef.current.isBoosting,
          playerStateRef.current.isDrifting,
          inputRef.current.steer
        );

        // Update Trail
        const rearAxlePos = new THREE.Vector3(
          playerStateRef.current.position.x - Math.sin(playerStateRef.current.heading) * 1.2,
          playerStateRef.current.position.y + 0.1,
          playerStateRef.current.position.z - Math.cos(playerStateRef.current.heading) * 1.2
        );
        playerTrail.addPoint(rearAxlePos, time);
        playerTrail.updateTime(time);

        // Update Sound
        soundEngine.updateEngineSound(
          playerStateRef.current.speedKmh,
          playerStateRef.current.isBoosting,
          playerStateRef.current.isBraking
        );
      }

      // Update Bots
      botManager.update(
        delta,
        time,
        roads,
        buildings,
        allTrails,
        (deadBot, reason) => {
          soundEngine.playDerezzedExplosion();
          playerStateRef.current.kills += 1;
          playerStateRef.current.score += 500;
          setKillEvents((prev) => [
            ...prev,
            {
              id: `kill_${Date.now()}_${deadBot.id}`,
              killerName: playerStateRef.current.name,
              killerColor: playerStateRef.current.color,
              victimName: deadBot.name,
              victimColor: deadBot.color,
              reason: (reason as 'trail_collision' | 'building_crash' | 'boundary_out') || 'trail_collision',
              district: SF_DISTRICTS[deadBot.currentDistrict]?.name || 'San Francisco',
              timestamp: Date.now(),
            },
          ]);
        }
      );

      // Dynamic 3rd Person Chase Camera
      if (playerStateRef.current.isAlive) {
        const bikePos = playerStateRef.current.position;
        const bikeHeading = playerStateRef.current.heading;

        const cameraDist = 7.5 + (playerStateRef.current.speedKmh / 350) * 2.5;
        const cameraHeight = 3.2 + (playerStateRef.current.speedKmh / 350) * 0.8;

        const targetCamX = bikePos.x - Math.sin(bikeHeading) * cameraDist;
        const targetCamY = bikePos.y + cameraHeight;
        const targetCamZ = bikePos.z - Math.cos(bikeHeading) * cameraDist;

        camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 12 * delta);

        const lookAtTarget = new THREE.Vector3(
          bikePos.x + Math.sin(bikeHeading) * 10,
          bikePos.y + 1.2,
          bikePos.z + Math.cos(bikeHeading) * 10
        );
        camera.lookAt(lookAtTarget);

        // Speed-dependent FOV Warp & Bloom response
        const targetFov = 75 + (playerStateRef.current.speedKmh / 350) * 18 + (playerStateRef.current.isBoosting ? 6 : 0);
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6 * delta);
        camera.updateProjectionMatrix();

        if (playerStateRef.current.isBoosting) {
          bloomPass.strength = THREE.MathUtils.lerp(bloomPass.strength, 2.0, 8 * delta);
        } else {
          bloomPass.strength = THREE.MathUtils.lerp(bloomPass.strength, 1.35, 4 * delta);
        }
      }

      // Periodic React UI Update
      uiUpdateTimer += delta;
      if (uiUpdateTimer > 0.05) {
        uiUpdateTimer = 0;
        setPlayerState({ ...playerStateRef.current });
        setBotStates(botManager.getAllBotStates());
        setAllTrailSegments(allTrails);
      }

      // Post-Processing Composer Render
      composer.render();
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      playerTrail.dispose(scene);
      botManager.clearBots();
      renderer.dispose();
      composer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [roads, buildings, handleRespawn]);

  return (
    <div className="relative w-full h-full bg-[#020617] overflow-hidden">
      <div ref={containerRef} className="w-full h-full absolute inset-0 cursor-crosshair" />

      {/* Cyberpunk HUD */}
      <CyberHUD
        playerState={playerState}
        botStates={botStates}
        roads={roads}
        allTrailSegments={allTrailSegments}
        killEvents={killEvents}
        onRespawn={handleRespawn}
      />
    </div>
  );
};
