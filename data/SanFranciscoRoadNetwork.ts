import { DistrictDef, RoadSegmentDef, BuildingFootprint } from '../types';

export const SF_DISTRICTS: Record<string, DistrictDef> = {
  embarcadero: {
    id: 'embarcadero',
    name: 'The Embarcadero Waterfront',
    subtitle: '4.5km Coastal Expressway along San Francisco Bay',
    themeColor: '#00f3ff', // Electric Cyan
    speedLimitKmh: 320,
    center: { x: 900, z: 200 },
    radius: 1200,
  },
  financial: {
    id: 'financial',
    name: 'Financial District Canyon',
    subtitle: 'Salesforce Tower & Transamerica Skyscraper Corridors',
    themeColor: '#ffe600', // Cyber Gold
    speedLimitKmh: 260,
    center: { x: 300, z: 200 },
    radius: 900,
  },
  market_artery: {
    id: 'market_artery',
    name: 'Market Street Grand Artery',
    subtitle: 'High-Speed Diagonal Spine from Ferry Building to Twin Peaks',
    themeColor: '#ff0055', // Neon Magenta
    speedLimitKmh: 300,
    center: { x: 0, z: 0 },
    radius: 1500,
  },
  soma_grid: {
    id: 'soma_grid',
    name: 'SoMa Cyber-Grid',
    subtitle: '6-Lane Parallel Drag Avenues (Mission, Howard, Folsom)',
    themeColor: '#39ff14', // Neon Green
    speedLimitKmh: 290,
    center: { x: -200, z: -500 },
    radius: 1100,
  },
  bay_bridge: {
    id: 'bay_bridge',
    name: 'Bay Bridge Skyway',
    subtitle: 'Elevated Double-Deck Suspension Highway over SF Bay',
    themeColor: '#a855f7', // Cyber Purple
    speedLimitKmh: 350,
    center: { x: 1600, z: -300 },
    radius: 1400,
  },
  chinatown: {
    id: 'chinatown',
    name: 'Chinatown & North Beach',
    subtitle: 'Tight High-Density Neon Alleys & Columbus Diagonal',
    themeColor: '#ff5500', // Neon Orange
    speedLimitKmh: 220,
    center: { x: 400, z: 900 },
    radius: 800,
  },
  nob_hill: {
    id: 'nob_hill',
    name: 'Nob Hill & Twin Peaks Crest',
    subtitle: 'Steep Elevation Curves & Panoramic City Crests',
    themeColor: '#06b6d4', // Cyan Sky
    speedLimitKmh: 250,
    center: { x: -800, z: 700 },
    radius: 1000,
  },
};

export const SF_ROAD_SEGMENTS: RoadSegmentDef[] = [
  // ================= THE EMBARCADERO COASTAL HIGHWAY =================
  {
    id: 'emb_01',
    name: 'The Embarcadero (North - Pier 39 to Broadway)',
    districtId: 'embarcadero',
    type: 'freeway',
    start: { x: 800, y: 0, z: 1600 },
    end: { x: 950, y: 0, z: 800 },
    width: 28,
    lanes: 6,
    speedLimitKmh: 320,
  },
  {
    id: 'emb_02',
    name: 'The Embarcadero (Ferry Building Plaza Sweep)',
    districtId: 'embarcadero',
    type: 'freeway',
    start: { x: 950, y: 0, z: 800 },
    end: { x: 900, y: 0, z: 0 },
    width: 32,
    lanes: 8,
    speedLimitKmh: 320,
  },
  {
    id: 'emb_03',
    name: 'The Embarcadero (South - Ferry Building to Bay Bridge)',
    districtId: 'embarcadero',
    type: 'freeway',
    start: { x: 900, y: 0, z: 0 },
    end: { x: 750, y: 0, z: -800 },
    width: 28,
    lanes: 6,
    speedLimitKmh: 320,
  },
  {
    id: 'emb_04',
    name: 'The Embarcadero (Mission Creek / Oracle Park Reach)',
    districtId: 'embarcadero',
    type: 'freeway',
    start: { x: 750, y: 0, z: -800 },
    end: { x: 450, y: 0, z: -1600 },
    width: 26,
    lanes: 6,
    speedLimitKmh: 300,
  },

  // ================= MARKET STREET GRAND ARTERY (DIAGONAL) =================
  {
    id: 'market_01',
    name: 'Market Street (Ferry Building Plaza to 1st St)',
    districtId: 'market_artery',
    type: 'boulevard',
    start: { x: 900, y: 0, z: 0 },
    end: { x: 450, y: 0, z: -150 },
    width: 30,
    lanes: 6,
    speedLimitKmh: 280,
  },
  {
    id: 'market_02',
    name: 'Market Street (Montgomery & Financial Hub)',
    districtId: 'market_artery',
    type: 'boulevard',
    start: { x: 450, y: 0, z: -150 },
    end: { x: 0, y: 0, z: -300 },
    width: 30,
    lanes: 6,
    speedLimitKmh: 280,
  },
  {
    id: 'market_03',
    name: 'Market Street (Powell & Civic Center)',
    districtId: 'market_artery',
    type: 'boulevard',
    start: { x: 0, y: 0, z: -300 },
    end: { x: -600, y: 5, z: -500 },
    width: 28,
    lanes: 6,
    speedLimitKmh: 280,
  },
  {
    id: 'market_04',
    name: 'Market Street (Upper Market to Twin Peaks Climb)',
    districtId: 'market_artery',
    type: 'boulevard',
    start: { x: -600, y: 5, z: -500 },
    end: { x: -1400, y: 35, z: -900 },
    width: 26,
    lanes: 4,
    speedLimitKmh: 290,
  },

  // ================= BAY BRIDGE ELEVATED SKYWAY =================
  {
    id: 'bay_bridge_ramp',
    name: 'Bay Bridge Approach & On-Ramp',
    districtId: 'bay_bridge',
    type: 'ramp',
    start: { x: 600, y: 0, z: -700 },
    end: { x: 900, y: 25, z: -600 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 320,
    isElevated: true,
    elevation: 20,
  },
  {
    id: 'bay_bridge_span_1',
    name: 'Bay Bridge Suspension Span (SF Anchorage to Tower 1)',
    districtId: 'bay_bridge',
    type: 'bridge',
    start: { x: 900, y: 25, z: -600 },
    end: { x: 1800, y: 35, z: -400 },
    width: 28,
    lanes: 6,
    speedLimitKmh: 350,
    isElevated: true,
    elevation: 35,
  },
  {
    id: 'bay_bridge_span_2',
    name: 'Bay Bridge Main Cable Span (Treasure Island Vector)',
    districtId: 'bay_bridge',
    type: 'bridge',
    start: { x: 1800, y: 35, z: -400 },
    end: { x: 2800, y: 40, z: -200 },
    width: 28,
    lanes: 6,
    speedLimitKmh: 350,
    isElevated: true,
    elevation: 40,
  },

  // ================= SOMA 6-LANE PARALLEL DRAG STRIPS =================
  {
    id: 'soma_mission',
    name: 'Mission Street Boulevard',
    districtId: 'soma_grid',
    type: 'boulevard',
    start: { x: 650, y: 0, z: -250 },
    end: { x: -1200, y: 5, z: -850 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 270,
  },
  {
    id: 'soma_howard',
    name: 'Howard Street (High-Speed Westbound Drag Strip)',
    districtId: 'soma_grid',
    type: 'boulevard',
    start: { x: 750, y: 0, z: -450 },
    end: { x: -1100, y: 0, z: -1050 },
    width: 28,
    lanes: 5,
    speedLimitKmh: 300,
  },
  {
    id: 'soma_folsom',
    name: 'Folsom Street (High-Speed Eastbound Drag Strip)',
    districtId: 'soma_grid',
    type: 'boulevard',
    start: { x: -1100, y: 0, z: -1250 },
    end: { x: 750, y: 0, z: -650 },
    width: 28,
    lanes: 5,
    speedLimitKmh: 300,
  },
  {
    id: 'soma_harrison',
    name: 'Harrison Street Expressway',
    districtId: 'soma_grid',
    type: 'boulevard',
    start: { x: 700, y: 0, z: -850 },
    end: { x: -1000, y: 0, z: -1450 },
    width: 26,
    lanes: 5,
    speedLimitKmh: 300,
  },
  {
    id: 'soma_bryant',
    name: 'Bryant Street Highway Corridor',
    districtId: 'soma_grid',
    type: 'boulevard',
    start: { x: 650, y: 0, z: -1050 },
    end: { x: -900, y: 0, z: -1650 },
    width: 26,
    lanes: 5,
    speedLimitKmh: 300,
  },

  // ================= SOMA NORTH-SOUTH CROSS CONNECTORS =================
  {
    id: 'cross_1st',
    name: '1st Street (Salesforce Transit Center Artery)',
    districtId: 'soma_grid',
    type: 'street',
    start: { x: 500, y: 0, z: -100 },
    end: { x: 750, y: 0, z: -900 },
    width: 22,
    lanes: 4,
    speedLimitKmh: 240,
  },
  {
    id: 'cross_2nd',
    name: '2nd Street (Cyber Corridor)',
    districtId: 'soma_grid',
    type: 'street',
    start: { x: 300, y: 0, z: -180 },
    end: { x: 550, y: 0, z: -1000 },
    width: 22,
    lanes: 4,
    speedLimitKmh: 240,
  },
  {
    id: 'cross_3rd',
    name: '3rd Street (SFMOMA to Mission Bay Bridge)',
    districtId: 'soma_grid',
    type: 'street',
    start: { x: 100, y: 0, z: -250 },
    end: { x: 350, y: 0, z: -1100 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 250,
  },
  {
    id: 'cross_4th',
    name: '4th Street (Moscone Center to China Basin Drawbridge)',
    districtId: 'soma_grid',
    type: 'street',
    start: { x: -100, y: 0, z: -320 },
    end: { x: 150, y: 0, z: -1200 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 250,
  },
  {
    id: 'cross_5th',
    name: '5th Street (Mid-Market Connector)',
    districtId: 'soma_grid',
    type: 'street',
    start: { x: -300, y: 0, z: -400 },
    end: { x: -50, y: 0, z: -1300 },
    width: 22,
    lanes: 4,
    speedLimitKmh: 240,
  },

  // ================= FINANCIAL DISTRICT & CHINATOWN =================
  {
    id: 'fin_montgomery',
    name: 'Montgomery Street (Wall Street of the West)',
    districtId: 'financial',
    type: 'street',
    start: { x: 350, y: 0, z: -100 },
    end: { x: 450, y: 0, z: 800 },
    width: 22,
    lanes: 4,
    speedLimitKmh: 240,
  },
  {
    id: 'fin_california',
    name: 'California Street (Historic Cable Car Hill Climb)',
    districtId: 'financial',
    type: 'street',
    start: { x: 850, y: 0, z: 300 },
    end: { x: -700, y: 40, z: 300 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 260,
  },
  {
    id: 'fin_pine',
    name: 'Pine Street (High-Speed Westbound One-Way)',
    districtId: 'financial',
    type: 'street',
    start: { x: 800, y: 0, z: 450 },
    end: { x: -750, y: 35, z: 450 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 280,
  },
  {
    id: 'fin_bush',
    name: 'Bush Street (Eastbound One-Way Sprint)',
    districtId: 'financial',
    type: 'street',
    start: { x: -750, y: 30, z: 150 },
    end: { x: 750, y: 0, z: 150 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 280,
  },
  {
    id: 'china_columbus',
    name: 'Columbus Avenue (North Beach Diagonal Highway)',
    districtId: 'chinatown',
    type: 'boulevard',
    start: { x: 450, y: 0, z: 600 },
    end: { x: -100, y: 5, z: 1500 },
    width: 26,
    lanes: 4,
    speedLimitKmh: 270,
  },
  {
    id: 'china_grant',
    name: 'Grant Avenue (Chinatown Dragon Gate Alley)',
    districtId: 'chinatown',
    type: 'alley',
    start: { x: 200, y: 0, z: 50 },
    end: { x: 200, y: 10, z: 900 },
    width: 14,
    lanes: 2,
    speedLimitKmh: 200,
  },
  {
    id: 'china_broadway',
    name: 'Broadway Tunnel & Strip',
    districtId: 'chinatown',
    type: 'boulevard',
    start: { x: 900, y: 0, z: 950 },
    end: { x: -700, y: 20, z: 950 },
    width: 26,
    lanes: 4,
    speedLimitKmh: 270,
  },

  // ================= NOB HILL & TWIN PEAKS CREST =================
  {
    id: 'nob_crest',
    name: 'Nob Hill Crest Ridge Highway',
    districtId: 'nob_hill',
    type: 'street',
    start: { x: -700, y: 45, z: 100 },
    end: { x: -700, y: 40, z: 1200 },
    width: 22,
    lanes: 3,
    speedLimitKmh: 240,
  },
  {
    id: 'twin_peaks_loop',
    name: 'Twin Peaks Cyber-Lookout Expressway',
    districtId: 'nob_hill',
    type: 'freeway',
    start: { x: -1400, y: 35, z: -900 },
    end: { x: -1600, y: 70, z: -1400 },
    width: 24,
    lanes: 4,
    speedLimitKmh: 300,
  },
];

export const SF_LANDMARKS: BuildingFootprint[] = [
  {
    id: 'salesforce_tower',
    name: 'Salesforce Cyber-Tower',
    center: { x: 420, z: -80 },
    width: 75,
    depth: 75,
    height: 326,
    color: '#00f3ff',
    isLandmark: true,
    landmarkType: 'salesforce',
  },
  {
    id: 'transamerica_pyramid',
    name: 'Transamerica Cyber-Pyramid',
    center: { x: 430, z: 580 },
    width: 80,
    depth: 80,
    height: 260,
    color: '#ffe600',
    isLandmark: true,
    landmarkType: 'transamerica',
  },
  {
    id: 'ferry_building',
    name: 'Ferry Building Hologram Clock Tower',
    center: { x: 930, z: 0 },
    width: 140,
    depth: 45,
    height: 75,
    color: '#ff0055',
    isLandmark: true,
    landmarkType: 'ferry_building',
  },
  {
    id: 'coit_tower',
    name: 'Coit Tower Beacon',
    center: { x: 500, z: 1250 },
    width: 40,
    depth: 40,
    height: 64,
    color: '#39ff14',
    isLandmark: true,
    landmarkType: 'coit_tower',
  },
  {
    id: '555_california',
    name: '555 California Monolith',
    center: { x: 300, z: 320 },
    width: 85,
    depth: 85,
    height: 237,
    color: '#38bdf8',
    isLandmark: true,
    landmarkType: 'skyscraper',
  },
  {
    id: '181_fremont',
    name: '181 Fremont High-Spire',
    center: { x: 480, z: -180 },
    width: 60,
    depth: 60,
    height: 245,
    color: '#c084fc',
    isLandmark: true,
    landmarkType: 'skyscraper',
  },
  {
    id: 'oracle_park_arena',
    name: 'Mission Bay Cyber-Colosseum (Oracle Park)',
    center: { x: 550, z: -1500 },
    width: 180,
    depth: 180,
    height: 48,
    color: '#f97316',
    isLandmark: true,
    landmarkType: 'commercial',
  },
  {
    id: 'sfmoma_cube',
    name: 'SFMOMA Digital Pavilion',
    center: { x: 180, z: -350 },
    width: 90,
    depth: 90,
    height: 65,
    color: '#ec4899',
    isLandmark: true,
    landmarkType: 'commercial',
  },
];

// Procedurally generate dense city blocks along the San Francisco grid
export function generateCityBuildings(): BuildingFootprint[] {
  const buildings: BuildingFootprint[] = [...SF_LANDMARKS];

  // SoMa grid buildings (Between Mission and Bryant, 1st to 6th st)
  for (let x = -800; x <= 600; x += 140) {
    for (let z = -1400; z <= -300; z += 150) {
      // Don't spawn on road centerlines
      if (Math.abs(x % 200) < 30 || Math.abs(z % 200) < 30) continue;
      // Skip if too close to an existing landmark
      const tooClose = buildings.some(b => {
        const dx = b.center.x - x;
        const dz = b.center.z - z;
        return Math.sqrt(dx * dx + dz * dz) < 80;
      });
      if (tooClose) continue;

      const height = 40 + Math.random() * 120 + (x > 100 && z > -600 ? 100 : 0);
      buildings.push({
        id: `bld_soma_${x}_${z}`,
        center: { x: x + (Math.random() - 0.5) * 20, z: z + (Math.random() - 0.5) * 20 },
        width: 70 + Math.random() * 30,
        depth: 70 + Math.random() * 30,
        height,
        color: height > 140 ? '#00f3ff' : height > 80 ? '#38bdf8' : '#64748b',
        landmarkType: 'skyscraper',
      });
    }
  }

  // Financial District & Chinatown dense blocks
  for (let x = -400; x <= 650; x += 120) {
    for (let z = 50; z <= 1200; z += 130) {
      const tooClose = buildings.some(b => {
        const dx = b.center.x - x;
        const dz = b.center.z - z;
        return Math.sqrt(dx * dx + dz * dz) < 70;
      });
      if (tooClose) continue;

      const isFinCenter = x > 100 && x < 550 && z < 700;
      const height = isFinCenter ? 120 + Math.random() * 140 : 30 + Math.random() * 60;
      buildings.push({
        id: `bld_fin_${x}_${z}`,
        center: { x, z },
        width: 65 + Math.random() * 25,
        depth: 65 + Math.random() * 25,
        height,
        color: isFinCenter ? '#ffe600' : '#ff5500',
        landmarkType: isFinCenter ? 'skyscraper' : 'commercial',
      });
    }
  }

  return buildings;
}
