import React, { useRef, useEffect } from 'react';
import { BikeState, RoadSegmentDef, TrailWallSegment } from '../types';
import { SF_DISTRICTS } from '../data/SanFranciscoRoadNetwork';

interface MinimapProps {
  playerState: BikeState;
  botStates: BikeState[];
  roads: RoadSegmentDef[];
  allTrailSegments: TrailWallSegment[];
}

export const Minimap: React.FC<MinimapProps> = ({
  playerState,
  botStates,
  roads,
  allTrailSegments,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const mapScale = 0.055; // pixels per world meter

    // Clear canvas
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Center minimap on player
    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Draw Grid Lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    const gridSize = 200 * mapScale;
    const offsetX = (playerState.position.x * mapScale) % gridSize;
    const offsetZ = (playerState.position.z * mapScale) % gridSize;

    for (let x = -width / 2 - gridSize; x <= width / 2 + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x - offsetX, -height / 2);
      ctx.lineTo(x - offsetX, height / 2);
      ctx.stroke();
    }
    for (let y = -height / 2 - gridSize; y <= height / 2 + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-width / 2, y - offsetZ);
      ctx.lineTo(width / 2, y - offsetZ);
      ctx.stroke();
    }

    // World to canvas coordinate transform relative to player
    const worldToCanvas = (wx: number, wz: number) => ({
      cx: (wx - playerState.position.x) * mapScale,
      cy: (wz - playerState.position.z) * mapScale,
    });

    // 1. Draw Districts (Soft ambient circles)
    Object.values(SF_DISTRICTS).forEach(dist => {
      const pos = worldToCanvas(dist.center.x, dist.center.z);
      const rad = dist.radius * mapScale;
      ctx.beginPath();
      ctx.arc(pos.cx, pos.cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = `${dist.themeColor}0a`;
      ctx.fill();
      ctx.strokeStyle = `${dist.themeColor}22`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 2. Draw Road Corridors
    roads.forEach(road => {
      const p1 = worldToCanvas(road.start.x, road.start.z);
      const p2 = worldToCanvas(road.end.x, road.end.z);

      const district = SF_DISTRICTS[road.districtId];
      const color = district ? district.themeColor : '#64748b';

      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, (road.width * mapScale) * 0.8);
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    // 3. Draw Active Light Trail Segments
    for (let i = 0; i < allTrailSegments.length; i++) {
      const seg = allTrailSegments[i];
      const p1 = worldToCanvas(seg.x1, seg.z1);
      const p2 = worldToCanvas(seg.x2, seg.z2);

      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.strokeStyle = seg.playerColor || '#00f3ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 4. Draw Bot Markers
    botStates.forEach(bot => {
      if (!bot.isAlive) return;
      const bPos = worldToCanvas(bot.position.x, bot.position.z);
      ctx.beginPath();
      ctx.arc(bPos.cx, bPos.cy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = bot.color;
      ctx.shadowColor = bot.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 5. Draw Local Player (Center)
    ctx.save();
    ctx.shadowColor = playerState.color || '#00f3ff';
    ctx.shadowBlur = 10;

    // Arrow pointer for player heading
    ctx.rotate(-playerState.heading + Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = playerState.color || '#00f3ff';
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }, [playerState, botStates, roads, allTrailSegments]);

  return (
    <div className="relative w-48 h-48 rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950/90 shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-md">
      <canvas ref={canvasRef} width={192} height={192} className="w-full h-full block" />

      {/* Top Banner overlay */}
      <div className="absolute top-1.5 left-2 right-2 flex items-center justify-between text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400">
        <span>SF GPS RADAR</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
          LIVE
        </span>
      </div>

      {/* Compass heading */}
      <div className="absolute bottom-1.5 left-2 text-[8px] font-mono text-slate-400">
        HDG: {Math.round((((playerState.heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI))}°
      </div>
    </div>
  );
};
