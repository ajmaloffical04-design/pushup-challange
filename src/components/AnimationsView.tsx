import React, { useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import {
  calculatePushUpCalories,
  PUSH_UP_ORDER,
  PUSH_UP_VARIATIONS,
  PushUpType,
} from '../types';
import { PushUpAnimation } from './PushUpAnimation';

interface AnimationsViewProps {
  selectedType: PushUpType;
  bodyWeightKg: number;
  onSelectType: (type: PushUpType) => void;
  onStartTraining: (type: PushUpType) => void;
}

const SPEED_OPTIONS = [
  { label: '0.6× Slow', value: 0.6 },
  { label: '1.0× Normal', value: 1 },
  { label: '1.4× Fast', value: 1.4 },
];

export const AnimationsView: React.FC<AnimationsViewProps> = ({
  selectedType,
  bodyWeightKg,
  onSelectType,
  onStartTraining,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  const meta = PUSH_UP_VARIATIONS[selectedType];
  const kcalPer20 = calculatePushUpCalories(20, selectedType, 25000, bodyWeightKg);
  const repsFor200KcalCoke = Math.round(200 / (kcalPer20 / 20));

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            Biomechanical Form Studio
          </p>
          <h1 className="font-sf-display text-3xl font-bold tracking-tight text-[#0A0A0C] dark:text-white mt-0.5 text-balance">
            Push-Up Animations by Muscle Focus
          </h1>
        </div>

        {/* Muscle Type Switcher */}
        <div
          role="tablist"
          aria-label="Choose push-up variation"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] self-start sm:self-auto"
        >
          {PUSH_UP_ORDER.map((key) => {
            const active = key === selectedType;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  onSelectType(key);
                  setScrubValue(null);
                  setIsPlaying(true);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#2C2C32] text-[#0A0A0C] dark:text-white shadow-sm'
                    : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#0A0A0C] dark:hover:text-white'
                }`}
              >
                {PUSH_UP_VARIATIONS[key].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Split: Large Studio Stage + Coaching & Burn Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive Animation Stage */}
        <div className="lg:col-span-7 rounded-[32px] pushr-spotlight border border-black/[0.08] dark:border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
                {meta.label} Target · {meta.targetMuscles}
              </p>
              <h2 className="font-sf-display text-2xl font-bold tracking-tight text-[#0A0A0C] dark:text-white mt-0.5">
                {meta.variationName}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setScrubValue(null);
                setIsPlaying((p) => !p);
              }}
              aria-label={isPlaying && scrubValue === null ? 'Pause animation' : 'Play animation'}
              className="w-11 h-11 rounded-full pushr-pill flex items-center justify-center text-[#0A0A0C] dark:text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              {isPlaying && scrubValue === null ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          </div>

          <div className="my-2">
            <PushUpAnimation
              type={selectedType}
              autoPlay={isPlaying && scrubValue === null}
              speed={speed}
              manualProgress={scrubValue}
            />
          </div>

          {/* Playback Tempo + Depth Scrubber */}
          <div className="mt-5 pt-4 border-t border-black/[0.08] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSpeed(opt.value);
                    setScrubValue(null);
                    setIsPlaying(true);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    speed === opt.value && scrubValue === null
                      ? 'bg-[#0A0A0C] text-white dark:bg-white dark:text-[#0A0A0C]'
                      : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#52525B] dark:text-[#D4D4D8] hover:bg-black/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-1 sm:max-w-[230px]">
              <label htmlFor="depth-scrubber" className="text-xs text-[#6E6E73] dark:text-[#9898A0] whitespace-nowrap">
                Inspect depth
              </label>
              <input
                id="depth-scrubber"
                type="range"
                min={0}
                max={100}
                value={scrubValue !== null ? Math.round(scrubValue * 100) : 0}
                onChange={(e) => {
                  setIsPlaying(false);
                  setScrubValue(Number(e.target.value) / 100);
                }}
                className="w-full accent-[#0A0A0C] dark:accent-white cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right: Biomechanical Cues, Calorie Math & Start CTA */}
        <div className="lg:col-span-5 rounded-[32px] bg-white/90 dark:bg-[#17171B]/90 border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">Hand Placement</p>
              <p className="mt-1 text-sm font-semibold text-[#0A0A0C] dark:text-white leading-snug">
                {meta.handPosition}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#1F1F25] p-3.5">
                <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">20 Reps Burn</p>
                <p className="font-sf-display text-xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-0.5">
                  {kcalPer20.toFixed(1)} <span className="text-xs font-medium text-[#6E6E73]">kcal</span>
                </p>
              </div>
              <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#1F1F25] p-3.5">
                <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">Burn 1 Coke (200 kcal)</p>
                <p className="font-sf-display text-xl font-bold tabular-nums text-[#E53935] mt-0.5">
                  ~{repsFor200KcalCoke} <span className="text-xs font-medium text-[#6E6E73]">reps</span>
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0] mb-2.5">
                Execution Cues
              </p>
              <ol className="space-y-2.5">
                {meta.cues.map((cue, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-[#3A3A40] dark:text-[#D4D4D8] leading-relaxed">
                    <span className="font-sf-mono text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span>{cue}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
                Post-Set Protein Pairing
              </p>
              <p className="mt-1 text-xs text-[#3A3A40] dark:text-[#D4D4D8] leading-relaxed">
                {meta.recommendedProteinTip}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartTraining(selectedType)}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Train {meta.label} in Timer Studio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* All 4 Variations Side-by-Side Quick Switcher Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PUSH_UP_ORDER.map((typeKey) => {
          const item = PUSH_UP_VARIATIONS[typeKey];
          const active = typeKey === selectedType;
          return (
            <button
              key={typeKey}
              type="button"
              onClick={() => {
                onSelectType(typeKey);
                setScrubValue(null);
                setIsPlaying(true);
              }}
              className={`text-left rounded-3xl p-4 border transition-all cursor-pointer ${
                active
                  ? 'bg-white dark:bg-[#1C1C22] border-[#0A0A0C] dark:border-white shadow-sm'
                  : 'bg-white/75 dark:bg-[#151519] border-black/[0.06] dark:border-white/[0.07] hover:bg-white dark:hover:bg-[#1B1B20]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-sf-display text-sm font-bold text-[#0A0A0C] dark:text-white">
                  {item.label}
                </span>
                <span className="text-[11px] text-[#6E6E73] dark:text-[#9898A0]">
                  {item.variationName}
                </span>
              </div>
              <PushUpAnimation type={typeKey} autoPlay={active} compact />
              <p className="mt-2 text-xs text-[#6E6E73] dark:text-[#9898A0] truncate">
                {item.targetMuscles}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
