export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface DistrictDef {
  id: string;
  name: string;
  subtitle: string;
  themeColor: string;
  speedLimitKmh: number;
  center: { x: number; z: number };
  radius: number;
}

export interface RoadNode {
  id: string;
  position: Vector3D;
  name?: string;
  elevation?: number;
}

export interface RoadSegmentDef {
  id: string;
  name: string;
  districtId: string;
  type: 'freeway' | 'boulevard' | 'street' | 'alley' | 'bridge' | 'ramp';
  start: Vector3D;
  end: Vector3D;
  width: number;
  lanes: number;
  speedLimitKmh: number;
  isElevated?: boolean;
  elevation?: number;
}

export interface BuildingFootprint {
  id: string;
  name?: string;
  center: { x: number; z: number };
  width: number;
  depth: number;
  height: number;
  color?: string;
  isLandmark?: boolean;
  landmarkType?: 'salesforce' | 'transamerica' | 'ferry_building' | 'coit_tower' | 'skyscraper' | 'commercial';
}

export interface TrailPoint {
  x: number;
  y: number;
  z: number;
  time: number;
  distance: number;
}

export interface TrailWallSegment {
  id: string;
  playerId: string;
  playerColor: string;
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  height: number;
  createdAt: number;
  length: number;
}

export interface BikeState {
  id: string;
  name: string;
  isLocal: boolean;
  color: string;
  position: Vector3D;
  velocity: Vector3D;
  heading: number; // yaw in radians
  pitch: number;
  roll: number; // lean angle
  speedKmh: number;
  nitro: number; // 0 - 100
  isBoosting: boolean;
  isDrifting: boolean;
  isBraking: boolean;
  isAlive: boolean;
  currentDistrict: string;
  currentStreet: string;
  score: number;
  kills: number;
  totalDistanceTraveled: number;
  timeSurvivedSeconds: number;
}

export interface KillEvent {
  id: string;
  killerName: string;
  killerColor: string;
  victimName: string;
  victimColor: string;
  reason: 'trail_collision' | 'building_crash' | 'boundary_out' | 'head_on';
  district: string;
  timestamp: number;
}
