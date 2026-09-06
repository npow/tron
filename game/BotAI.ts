import * as THREE from 'three';
import { BikeState, RoadSegmentDef, BuildingFootprint, TrailWallSegment } from '../types';
import { ControlInput, PhysicsEngine } from './PhysicsEngine';
import { TrailSystem } from './TrailSystem';
import { createLightcycleMesh, LightcycleVisuals } from './LightcycleMesh';

export interface BotInstance {
  state: BikeState;
  visuals: LightcycleVisuals;
  trail: TrailSystem;
  targetRoadIndex: number;
  aiTimer: number;
}

export class BotAIManager {
  private bots: BotInstance[] = [];
  private scene: THREE.Scene;

  private static BOT_PROFILES = [
    { name: 'CLU_V2', color: '#ff7700', startPos: { x: 800, y: 0, z: 1200 }, heading: 0.1 },
    { name: 'RINZLER_X', color: '#ff0033', startPos: { x: -600, y: 0, z: -900 }, heading: 2.4 },
    { name: 'QUORRA', color: '#ffffff', startPos: { x: 300, y: 0, z: 300 }, heading: -1.5 },
    { name: 'FLYNN_GRID', color: '#00e5ff', startPos: { x: 1200, y: 30, z: -500 }, heading: 1.8 },
    { name: 'NEO_CYBER', color: '#39ff14', startPos: { x: -200, y: 0, z: 700 }, heading: -0.8 },
    { name: 'DAFT_UNIT', color: '#c084fc', startPos: { x: 500, y: 0, z: -1200 }, heading: 3.1 },
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public initBots(count: number = 5) {
    this.clearBots();
    const spawnCount = Math.min(count, BotAIManager.BOT_PROFILES.length);

    for (let i = 0; i < spawnCount; i++) {
      const profile = BotAIManager.BOT_PROFILES[i];
      const state: BikeState = {
        id: `bot_${i}_${profile.name}`,
        name: profile.name,
        isLocal: false,
        color: profile.color,
        position: { ...profile.startPos },
        velocity: { x: 0, y: 0, z: 0 },
        heading: profile.heading,
        pitch: 0,
        roll: 0,
        speedKmh: 160,
        nitro: 100,
        isBoosting: false,
        isDrifting: false,
        isBraking: false,
        isAlive: true,
        currentDistrict: 'market_artery',
        currentStreet: 'San Francisco Cyber-Way',
        score: 0,
        kills: 0,
        totalDistanceTraveled: 0,
        timeSurvivedSeconds: 0,
      };

      const visuals = createLightcycleMesh(profile.color);
      this.scene.add(visuals.group);

      const trail = new TrailSystem(this.scene, state.id, profile.color);

      this.bots.push({
        state,
        visuals,
        trail,
        targetRoadIndex: Math.floor(Math.random() * 20),
        aiTimer: Math.random() * 2.0,
      });
    }
  }

  public update(
    delta: number,
    time: number,
    roads: RoadSegmentDef[],
    buildings: BuildingFootprint[],
    allTrailSegments: TrailWallSegment[],
    onBotDerezzed?: (botState: BikeState, reason: string) => void
  ) {
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (!bot.state.isAlive) continue;

      bot.aiTimer += delta;

      // AI Decision Logic
      const input = this.computeBotInput(bot, delta, roads, buildings, allTrailSegments);

      // Physics update
      const { collided, collisionReason } = PhysicsEngine.updateBikePhysics(
        bot.state,
        input,
        delta,
        roads,
        buildings,
        allTrailSegments
      );

      if (collided) {
        bot.state.isAlive = false;
        bot.visuals.group.visible = false;
        if (onBotDerezzed) {
          onBotDerezzed(bot.state, collisionReason || 'trail_collision');
        }
        continue;
      }

      // Update 3D visual position & rotation
      bot.visuals.group.position.set(bot.state.position.x, bot.state.position.y, bot.state.position.z);
      bot.visuals.group.rotation.y = bot.state.heading;
      bot.visuals.group.rotation.z = bot.state.roll;

      bot.visuals.updateAnimation(delta, bot.state.speedKmh, bot.state.isBoosting, bot.state.isDrifting, input.steer);

      // Update Light Ribbon Trail
      const rearAxlePos = new THREE.Vector3(
        bot.state.position.x - Math.sin(bot.state.heading) * 1.2,
        bot.state.position.y + 0.1,
        bot.state.position.z - Math.cos(bot.state.heading) * 1.2
      );
      bot.trail.addPoint(rearAxlePos, time);
      bot.trail.updateTime(time);
    }
  }

  private computeBotInput(
    bot: BotInstance,
    delta: number,
    roads: RoadSegmentDef[],
    buildings: BuildingFootprint[],
    allTrailSegments: TrailWallSegment[]
  ): ControlInput {
    const targetRoad = roads[bot.targetRoadIndex % roads.length];
    const targetPos = targetRoad ? targetRoad.end : { x: 0, y: 0, z: 0 };

    // Vector to destination road target
    const dx = targetPos.x - bot.state.position.x;
    const dz = targetPos.z - bot.state.position.z;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);

    if (distToTarget < 60 || bot.aiTimer > 8.0) {
      bot.targetRoadIndex = Math.floor(Math.random() * roads.length);
      bot.aiTimer = 0;
    }

    const desiredHeading = Math.atan2(dx, dz);
    let headingDiff = desiredHeading - bot.state.heading;
    while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
    while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;

    let steer = Math.max(-1, Math.min(1, headingDiff * 2.5));

    // Obstacle Avoidance Raycasts (Forward Left, Forward Center, Forward Right)
    const forwardX = Math.sin(bot.state.heading);
    const forwardZ = Math.cos(bot.state.heading);
    const lookAheadDist = Math.max(30, bot.state.speedKmh * 0.3);

    const probeAngles = [0, -0.35, 0.35, -0.7, 0.7];
    let emergencyTurn = 0;
    let obstacleNear = false;

    for (let p = 0; p < probeAngles.length; p++) {
      const probeAngle = bot.state.heading + probeAngles[p];
      const px = bot.state.position.x + Math.sin(probeAngle) * lookAheadDist;
      const pz = bot.state.position.z + Math.cos(probeAngle) * lookAheadDist;

      // Check buildings
      for (let b = 0; b < buildings.length; b++) {
        const bld = buildings[b];
        const halfW = bld.width * 0.5 + 4;
        const halfD = bld.depth * 0.5 + 4;
        if (px >= bld.center.x - halfW && px <= bld.center.x + halfW &&
            pz >= bld.center.z - halfD && pz <= bld.center.z + halfD) {
          obstacleNear = true;
          emergencyTurn = probeAngles[p] <= 0 ? 1.0 : -1.0;
          break;
        }
      }
      if (obstacleNear) break;
    }

    if (obstacleNear) {
      steer = emergencyTurn;
    }

    const boost = !obstacleNear && Math.abs(headingDiff) < 0.2 && Math.random() < 0.15 && bot.state.nitro > 40;
    const drift = Math.abs(steer) > 0.6 && bot.state.speedKmh > 180;

    return {
      throttle: 1.0,
      brake: obstacleNear ? 0.4 : 0.0,
      steer,
      boost,
      drift,
    };
  }

  public getAllBotTrails(): TrailWallSegment[] {
    const allSegs: TrailWallSegment[] = [];
    for (let i = 0; i < this.bots.length; i++) {
      if (this.bots[i].state.isAlive) {
        allSegs.push(...this.bots[i].trail.getSegments());
      }
    }
    return allSegs;
  }

  public getAllBotStates(): BikeState[] {
    return this.bots.map(b => b.state);
  }

  public clearBots() {
    for (let i = 0; i < this.bots.length; i++) {
      this.bots[i].trail.dispose(this.scene);
      this.scene.remove(this.bots[i].visuals.group);
    }
    this.bots = [];
  }
}
