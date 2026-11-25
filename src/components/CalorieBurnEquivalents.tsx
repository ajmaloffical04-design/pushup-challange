import React, { useState } from 'react';
import { CALORIE_EQUIVALENTS, CalorieEquivalentItem, describeCalorieEquivalent } from '../types';

interface CalorieBurnEquivalentsProps {
  totalKcal: number;
  setKcal?: number;
  compact?: boolean;
}

export const CalorieBurnEquivalents: React.FC<CalorieBurnEquivalentsProps> = ({
  totalKcal,
  setKcal,
  compact = false,
}) => {
  const [selectedId, setSelectedId] = useState<string>('coke_bottle');
  const selected: CalorieEquivalentItem =
    CALORIE_EQUIVALENTS.find((item) => item.id === selectedId) || CALORIE_EQUIVALENTS[0];

  const { ratio, percent, summary } = describeCalorieEquivalent(totalKcal, selected);
  const clampedFill = Math.min(100, Math.max(0, percent));

  // Always compute the headline 200 kcal Coca-Cola bottle example as requested
  const coke200Ratio = totalKcal / 200;

  return (
    <div className="rounded-3xl bg-white/85 dark:bg-[#17171B]/90 border border-black/[0.06] dark:border-white/[0.08] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            Calorie Burn Equivalent
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-sf-display text-3xl font-bold tracking-tight tabular-nums text-[#0A0A0C] dark:text-white">
              {totalKcal.toFixed(1)}
            </span>
            <span className="text-sm font-medium text-[#6E6E73] dark:text-[#9898A0]">kcal burned</span>
            {typeof setKcal === 'number' && setKcal > 0 && (
              <span className="text-xs font-medium text-[#E53935] tabular-nums">
                +{setKcal.toFixed(1)} this set
              </span>
            )}
          </div>
        </div>

        {/* Crisp SVG Cola / Energy Burn Gauge */}
        <div className="shrink-0 flex flex-col items-center">
          <svg width="36" height="52" viewBox="0 0 36 52" aria-hidden="true">
            <defs>
              <clipPath id={`canClip-${compact ? 'c' : 'f'}`}>
                <rect x="7" y="10" width="22" height="36" rx="5" />
              </clipPath>
            </defs>
            {/* Can/Bottle cap */}
            <rect x="13" y="4" width="10" height="5" rx="2" className="fill-[#D4D4D8] dark:fill-[#3F3F46]" />
            {/* Body outline */}
            <rect
              x="7"
              y="10"
              width="22"
              height="36"
              rx="5"
              className="fill-[#F4F4F6] dark:fill-[#27272A] stroke-black/15 dark:stroke-white/20"
              strokeWidth="1.25"
            />
            {/* Burned fill rising from bottom */}
            <g clipPath={`url(#canClip-${compact ? 'c' : 'f'})`}>
              <rect
                x="7"
                y={10 + 36 * (1 - clampedFill / 100)}
                width="22"
                height={36 * (clampedFill / 100)}
                fill="#E53935"
                opacity="0.88"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Progress Bar & Real-World Comparison Readout */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-[#0A0A0C] dark:text-[#F5F5F7]">{summary}</span>
          <span className="font-sf-mono tabular-nums text-[#6E6E73] dark:text-[#9898A0]">
            {Math.min(999, percent)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-black/[0.07] dark:bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#E53935] transition-all duration-300"
            style={{ width: `${Math.min(100, clampedFill)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#6E6E73] dark:text-[#9898A0] leading-relaxed">
          {coke200Ratio >= 1
            ? `You burned ${coke200Ratio.toFixed(2)}× a 200 kcal Coca-Cola (500 ml).`
            : `${Math.max(0, Math.round(200 - totalKcal))} kcal left to burn off a full 200 kcal Coca-Cola (500 ml).`}
          {ratio >= 1 && selected.id !== 'coke_bottle' && (
            <> Equivalent to {ratio.toFixed(1)}× {selected.name}.</>
          )}
        </p>
      </div>

      {/* Interactive Food / Drink Comparator Buttons */}
      {!compact && (
        <div className="mt-4 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08]">
          <p className="text-xs text-[#6E6E73] dark:text-[#9898A0] mb-2">Compare burn against:</p>
          <div className="flex flex-wrap gap-1.5">
            {CALORIE_EQUIVALENTS.map((item) => {
              const active = item.id === selected.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#0A0A0C] text-white dark:bg-white dark:text-[#0A0A0C]'
                      : 'bg-black/[0.045] dark:bg-white/[0.06] text-[#3A3A40] dark:text-[#D4D4D8] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                  }`}
                >
                  {item.name} · {item.kcal} kcal
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
