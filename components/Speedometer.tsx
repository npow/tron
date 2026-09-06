import React from 'react';

interface SpeedometerProps {
  speedKmh: number;
  nitro: number;
  isBoosting: boolean;
  isDrifting: boolean;
}

export const Speedometer: React.FC<SpeedometerProps> = ({
  speedKmh,
  nitro,
  isBoosting,
  isDrifting,
}) => {
  const normSpeed = Math.min(speedKmh / 350, 1.0);
  const strokeDash = normSpeed * 220;

  return (
    <div className="relative flex flex-col items-center select-none font-mono">
      {/* Outer Neon Dial */}
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r="40"
            className="stroke-slate-800/80 fill-none"
            strokeWidth="6"
            strokeDasharray="220"
            strokeDashoffset="0"
          />
          {/* Speed Arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            className={`fill-none transition-all duration-75 ${
              isBoosting
                ? 'stroke-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                : isDrifting
                ? 'stroke-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]'
                : 'stroke-cyan-500 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]'
            }`}
            strokeWidth="7"
            strokeDasharray="220"
            strokeDashoffset={220 - strokeDash}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Digital Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-extrabold tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
            {speedKmh}
          </div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-cyan-400">
            KM / H
          </div>
          {isBoosting && (
            <span className="mt-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 animate-pulse">
              NITRO
            </span>
          )}
          {isDrifting && !isBoosting && (
            <span className="mt-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-400 border border-pink-400/50 animate-pulse">
              DRIFT
            </span>
          )}
        </div>
      </div>

      {/* Nitro Boost Gauge */}
      <div className="w-48 bg-slate-950/80 p-2 rounded-xl border border-slate-800/80 backdrop-blur-md -mt-2">
        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            Nitro Boost
          </span>
          <span className="text-cyan-400">{Math.round(nitro)}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              nitro > 30
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse'
            }`}
            style={{ width: `${nitro}%` }}
          />
        </div>
      </div>
    </div>
  );
};
