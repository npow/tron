import React, { useState, useEffect } from 'react';
import { BikeState, RoadSegmentDef, TrailWallSegment, KillEvent } from '../types';
import { SF_DISTRICTS } from '../data/SanFranciscoRoadNetwork';
import { Speedometer } from './Speedometer';
import { Minimap } from './Minimap';
import { Volume2, VolumeX, Shield, Zap, Skull, RefreshCw, Crosshair, MapPin } from 'lucide-react';
import { soundEngine } from '../game/AudioEngine';

interface CyberHUDProps {
  playerState: BikeState;
  botStates: BikeState[];
  roads: RoadSegmentDef[];
  allTrailSegments: TrailWallSegment[];
  killEvents: KillEvent[];
  onRespawn: () => void;
}

export const CyberHUD: React.FC<CyberHUDProps> = ({
  playerState,
  botStates,
  roads,
  allTrailSegments,
  killEvents,
  onRespawn,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [districtAlert, setDistrictAlert] = useState<string | null>(null);

  const currentDistrict = SF_DISTRICTS[playerState.currentDistrict] || SF_DISTRICTS['market_artery'];
  const aliveCount = (playerState.isAlive ? 1 : 0) + botStates.filter(b => b.isAlive).length;

  useEffect(() => {
    setDistrictAlert(currentDistrict.name);
    soundEngine.playDistrictArrival();
    const timer = setTimeout(() => setDistrictAlert(null), 3500);
    return () => clearTimeout(timer);
  }, [playerState.currentDistrict]);

  const handleToggleSound = () => {
    soundEngine.init();
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 select-none font-mono">
      {/* 1. TOP HEADER BAR */}
      <div className="flex items-start justify-between">
        {/* Top Left: Player Status & Vitals */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
                IRL TRON: SAN FRANCISCO
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  5KM GRID
                </span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-green-400">
                  <Shield className="w-3 h-3" /> {aliveCount} BIKES ACTIVE
                </span>
                <span className="flex items-center gap-1 text-pink-400">
                  <Skull className="w-3 h-3" /> {playerState.kills} KILLS
                </span>
                <span>
                  DIST: {(playerState.totalDistanceTraveled / 1000).toFixed(2)} KM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Center: Current District & Street Banner */}
        <div className="flex flex-col items-center max-w-md text-center">
          <div
            className="px-6 py-2 rounded-2xl bg-slate-950/90 border backdrop-blur-md transition-all duration-300"
            style={{
              borderColor: `${currentDistrict.themeColor}88`,
              boxShadow: `0 0 20px ${currentDistrict.themeColor}33`,
            }}
          >
            <div
              className="text-xs uppercase font-extrabold tracking-widest"
              style={{ color: currentDistrict.themeColor }}
            >
              {currentDistrict.name}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 mt-0.5">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>{playerState.currentStreet}</span>
            </div>
          </div>

          {/* Large District Entry Flash Banner */}
          {districtAlert && (
            <div className="mt-4 px-6 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold uppercase tracking-widest animate-bounce">
              ⚡ ENTERING {districtAlert} ⚡
            </div>
          )}
        </div>

        {/* Top Right: Sound Toggle & Match Stats */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleToggleSound}
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 text-slate-300 transition-all shadow-md"
            title="Toggle Engine Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* 2. MIDDLE AREA: KILLFEED & COMBAT LOGS */}
      <div className="flex justify-between items-center pointer-events-none">
        {/* Left Killfeed */}
        <div className="flex flex-col gap-1.5 max-w-xs pl-2">
          {killEvents.slice(-4).map((evt) => (
            <div
              key={evt.id}
              className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-pink-500/30 text-[10px] text-slate-300 flex items-center gap-2 backdrop-blur-md animate-fadeIn"
            >
              <Crosshair className="w-3 h-3 text-pink-500 shrink-0" />
              <span>
                <b style={{ color: evt.victimColor }}>{evt.victimName}</b> derezzed in{' '}
                <span className="text-cyan-400">{evt.district}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. BOTTOM COCKPIT HUD */}
      <div className="flex items-end justify-between">
        {/* Bottom Left: San Francisco GPS Minimap */}
        <div className="pointer-events-auto">
          <Minimap
            playerState={playerState}
            botStates={botStates}
            roads={roads}
            allTrailSegments={allTrailSegments}
          />
        </div>

        {/* Bottom Center: Key Controls Guide */}
        <div className="bg-slate-950/70 border border-slate-800/60 px-4 py-2 rounded-xl text-[9px] text-slate-400 flex items-center gap-4 backdrop-blur-sm">
          <span><b className="text-white">W / ↑</b> Accelerate</span>
          <span><b className="text-white">A / D / ← →</b> Steer & Lean</span>
          <span><b className="text-cyan-400">SHIFT</b> Nitro Boost</span>
          <span><b className="text-pink-400">SPACE</b> Power Drift</span>
          <span><b className="text-white">S / ↓</b> Brake</span>
        </div>

        {/* Bottom Right: Speedometer & Nitro */}
        <div className="pointer-events-auto">
          <Speedometer
            speedKmh={playerState.speedKmh}
            nitro={playerState.nitro}
            isBoosting={playerState.isBoosting}
            isDrifting={playerState.isDrifting}
          />
        </div>
      </div>

      {/* 4. DEREZZED / GAME OVER OVERLAY MODAL */}
      {!playerState.isAlive && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center pointer-events-auto">
          <div className="max-w-md w-full bg-slate-900 border border-pink-500/40 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(236,72,153,0.3)]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pink-500/10 border border-pink-500/40 flex items-center justify-center">
              <Skull className="w-8 h-8 text-pink-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-1">
              CYCLE DEREZZED
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              You intersected a light ribbon barrier in {currentDistrict.name}.
            </p>

            {/* Match Summary Stats */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 mb-6 text-left">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Distance Traveled</div>
                <div className="text-lg font-black text-cyan-400">
                  {(playerState.totalDistanceTraveled / 1000).toFixed(2)} KM
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Top Speed</div>
                <div className="text-lg font-black text-pink-400">342 KM/H</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Time Survived</div>
                <div className="text-lg font-black text-white">
                  {Math.floor(playerState.timeSurvivedSeconds)}s
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Eliminations</div>
                <div className="text-lg font-black text-green-400">{playerState.kills}</div>
              </div>
            </div>

            <button
              onClick={onRespawn}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>REBOOT SYSTEM / RESPAWN (SPACE)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
