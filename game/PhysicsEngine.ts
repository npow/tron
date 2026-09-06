import * as THREE from 'three';
import { BikeState, RoadSegmentDef, BuildingFootprint, TrailWallSegment } from '../types';
import { SF_DISTRICTS, SF_ROAD_SEGMENTS } from '../data/SanFranciscoRoadNetwork';

export interface ControlInput {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  boost: boolean;
  drift: boolean;
}

export class PhysicsEngine {
  public static updateBikePhysics(
    bike: BikeState,
    input: ControlInput,
    delta: number,
    roads: RoadSegmentDef[],
    buildings: BuildingFootprint[],
    allTrailSegments: TrailWallSegment[]
  ): { collided: boolean; collisionReason?: 'trail_collision' | 'building_crash' | 'boundary_out' } {
    if (!bike.isAlive) {
      return { collided: false };
    }

    const dt = Math.min(delta, 0.1);

    // 1. Speeds & Accelerations
    const maxCruiseSpeed = 50.0; // ~180 km/h (m/s)
    const maxHighwaySpeed = 75.0; // ~270 km/h
    const maxBoostSpeed = 95.0; // ~342 km/h
    const minSpeed = 10.0; // minimum crawl speed

    // Nitro Boost Logic
    if (input.boost && bike.nitro > 5) {
      bike.isBoosting = true;
      bike.nitro = Math.max(0, bike.nitro - 25 * dt);
    } else {
      bike.isBoosting = false;
      bike.nitro = Math.min(100, bike.nitro + 12 * dt);
    }

    // Drift Logic
    bike.isDrifting = input.drift;
    bike.isBraking = input.brake > 0.1;

    // Target Speed calculation
    let targetSpeed = maxCruiseSpeed;
    if (bike.isBoosting) {
      targetSpeed = maxBoostSpeed;
    } else if (bike.isBraking) {
      targetSpeed = minSpeed;
    } else if (input.throttle > 0.1) {
      targetSpeed = maxHighwaySpeed;
    }

    // Acceleration / Deceleration curve
    const currentSpeed = Math.sqrt(bike.velocity.x * bike.velocity.x + bike.velocity.z * bike.velocity.z);
    const accelRate = bike.isBoosting ? 45.0 : bike.isBraking ? 55.0 : 25.0;

    let newSpeed = currentSpeed;
    if (currentSpeed < targetSpeed) {
      newSpeed = Math.min(targetSpeed, currentSpeed + accelRate * dt);
    } else {
      newSpeed = Math.max(targetSpeed, currentSpeed - accelRate * 0.8 * dt);
    }
    if (newSpeed < minSpeed && input.throttle > 0.1) newSpeed = minSpeed;

    // 2. Steering & Lean Dynamics
    // Turning rate decreases as speed increases for stability, but drift increases turn rate
    const baseTurnRate = 2.4;
    const speedTurnFactor = Math.max(0.4, 1.0 - (newSpeed / maxBoostSpeed) * 0.45);
    const driftTurnMultiplier = bike.isDrifting ? 1.7 : 1.0;
    const turnRate = baseTurnRate * speedTurnFactor * driftTurnMultiplier;

    bike.heading += input.steer * turnRate * dt;

    // Target Roll (Lean angle) on turns: up to ~38 degrees
    const targetRoll = -input.steer * (0.35 + (newSpeed / maxBoostSpeed) * 0.35) * (bike.isDrifting ? 1.3 : 1.0);
    bike.roll = THREE.MathUtils.lerp(bike.roll, targetRoll, 10 * dt);

    // 3. Position Update
    const prevPos = { ...bike.position };
    const forwardX = Math.sin(bike.heading);
    const forwardZ = Math.cos(bike.heading);

    bike.velocity.x = forwardX * newSpeed;
    bike.velocity.z = forwardZ * newSpeed;

    bike.position.x += bike.velocity.x * dt;
    bike.position.z += bike.velocity.z * dt;
    bike.speedKmh = Math.round(newSpeed * 3.6);

    const stepDist = Math.sqrt(
      (bike.position.x - prevPos.x) * (bike.position.x - prevPos.x) +
      (bike.position.z - prevPos.z) * (bike.position.z - prevPos.z)
    );
    bike.totalDistanceTraveled += stepDist;
    bike.timeSurvivedSeconds += dt;

    // 4. District & Street Recognition
    this.updateDistrictAndStreet(bike, roads);

    // 5. Collision Detection
    // A. Outer Boundary check (3000m radius)
    const distFromOrigin = Math.sqrt(bike.position.x * bike.position.x + bike.position.z * bike.position.z);
    if (distFromOrigin > 3200) {
      bike.isAlive = false;
      return { collided: true, collisionReason: 'boundary_out' };
    }

    // B. Building Collisions
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const halfW = b.width * 0.5 + 0.8;
      const halfD = b.depth * 0.5 + 0.8;
      if (
        bike.position.x >= b.center.x - halfW &&
        bike.position.x <= b.center.x + halfW &&
        bike.position.z >= b.center.z - halfD &&
        bike.position.z <= b.center.z + halfD
      ) {
        bike.isAlive = false;
        return { collided: true, collisionReason: 'building_crash' };
      }
    }

    // C. Trail Collisions (Line segment intersection against all active trails)
    // We check both the bike forward trajectory and the bike front bumper
    const frontX = bike.position.x + Math.sin(bike.heading) * 1.4;
    const frontZ = bike.position.z + Math.cos(bike.heading) * 1.4;
    const p1x = prevPos.x;
    const p1z = prevPos.z;
    const p2x = frontX;
    const p2z = frontZ;

    for (let i = 0; i < allTrailSegments.length; i++) {
      const seg = allTrailSegments[i];

      // Exact Z coordinates for 2D bounding box
      const segMinX = Math.min(seg.x1, seg.x2) - 0.8;
      const segMaxX = Math.max(seg.x1, seg.x2) + 0.8;
      const segMinZ = Math.min(seg.z1, seg.z2) - 0.8;
      const segMaxZ = Math.max(seg.z1, seg.z2) + 0.8;

      const pathMinX = Math.min(p1x, p2x) - 0.5;
      const pathMaxX = Math.max(p1x, p2x) + 0.5;
      const pathMinZ = Math.min(p1z, p2z) - 0.5;
      const pathMaxZ = Math.max(p1z, p2z) + 0.5;

      if (pathMaxX < segMinX || pathMinX > segMaxX || pathMaxZ < segMinZ || pathMinZ > segMaxZ) {
        continue;
      }

      // Check 2D line segment intersection between trajectory and trail ribbon
      if (
        this.checkLineIntersection(p1x, p1z, p2x, p2z, seg.x1, seg.z1, seg.x2, seg.z2) ||
        this.pointToSegmentDistance(frontX, frontZ, seg.x1, seg.z1, seg.x2, seg.z2) < 0.6 ||
        this.pointToSegmentDistance(bike.position.x, bike.position.z, seg.x1, seg.z1, seg.x2, seg.z2) < 0.6
      ) {
        bike.isAlive = false;
        return { collided: true, collisionReason: 'trail_collision' };
      }
    }

    return { collided: false };
  }

  private static checkLineIntersection(
    p0_x: number, p0_y: number, p1_x: number, p1_y: number,
    p2_x: number, p2_y: number, p3_x: number, p3_y: number
  ): boolean {
    const s1_x = p1_x - p0_x;
    const s1_y = p1_y - p0_y;
    const s2_x = p3_x - p2_x;
    const s2_y = p3_y - p2_y;

    const denom = -s2_x * s1_y + s1_x * s2_y;
    if (Math.abs(denom) < 0.00001) return false;

    const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / denom;
    const t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / denom;

    return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
  }

  private static updateDistrictAndStreet(bike: BikeState, roads: RoadSegmentDef[]) {
    // 1. Check District
    let closestDistrict = 'market_artery';
    let minDistrictDist = Infinity;

    Object.values(SF_DISTRICTS).forEach(dist => {
      const dx = bike.position.x - dist.center.x;
      const dz = bike.position.z - dist.center.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < dist.radius && d < minDistrictDist) {
        minDistrictDist = d;
        closestDistrict = dist.id;
      }
    });
    bike.currentDistrict = closestDistrict;

    // 2. Check Closest Street
    let closestRoad = 'San Francisco Cyber-Way';
    let minRoadDist = Infinity;

    for (let i = 0; i < roads.length; i++) {
      const road = roads[i];
      const dist = this.pointToSegmentDistance(
        bike.position.x, bike.position.z,
        road.start.x, road.start.z,
        road.end.x, road.end.z
      );
      if (dist < road.width && dist < minRoadDist) {
        minRoadDist = dist;
        closestRoad = road.name;
      }
    }
    bike.currentStreet = closestRoad;
  }

  private static pointToSegmentDistance(
    px: number, pz: number,
    x1: number, z1: number,
    x2: number, z2: number
  ): number {
    const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (pz - z1) * (pz - z1));
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projZ = z1 + t * (z2 - z1);
    return Math.sqrt((px - projX) * (px - projX) + (pz - projZ) * (pz - projZ));
  }
}
