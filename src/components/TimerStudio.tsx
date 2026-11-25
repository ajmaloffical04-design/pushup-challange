import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Camera, CameraOff, Minus, Moon, Pause, Play, Plus, Sun, Timer, Volume2, VolumeX, X } from 'lucide-react';
import {
  calculatePushUpCalories,
  formatReminderTime12h,
  formatStopwatch,
  PUSH_UP_ORDER,
  PUSH_UP_VARIATIONS,
  PushUpType,
} from '../types';
import { CalorieBurnEquivalents } from './CalorieBurnEquivalents';
import { PushUpAnimation } from './PushUpAnimation';
import { SetCompleteModal } from './SetCompleteModal';

interface TimerStudioProps {
  activePushUpType: PushUpType;
  onChangePushUpType: (type: PushUpType) => void;
  todaySetsCount: number;
  todayTotalReps: number;
  todayTotalCalories: number;
  bodyWeightKg: number;
  isDark: boolean;
  onToggleDark: () => void;
  reminderEnabled: boolean;
  reminderTime: string;
  onOpenReminder: () => void;
  onSaveCompletedSet: (payload: {
    pushUpType: PushUpType;
    reps: number;
    durationMs: number;
    notes: string;
    selectedProteinFoods: Array<{
      foodName: string;
      serving: string;
      proteinGrams: number;
      calories: number;
    }>;
  }) => Promise<void>;
}

const TIMER_PRESETS = [
  { id: 'stopwatch', label: 'Stopwatch', seconds: 0 },
  { id: '30s', label: '30s', seconds: 30 },
  { id: '60s', label: '60s', seconds: 60 },
  { id: '90s', label: '90s', seconds: 90 },
  { id: '120s', label: '2m', seconds: 120 },
] as const;

const REP_TARGET_PRESETS = [
  { label: '10 / set', value: 10 },
  { label: '15 / set', value: 15 },
  { label: '20 / set', value: 20 },
  { label: '25 / set', value: 25 },
  { label: 'Free', value: 0 },
] as const;

export const TimerStudio: React.FC<TimerStudioProps> = ({
  activePushUpType,
  onChangePushUpType,
  todaySetsCount,
  todayTotalReps,
  todayTotalCalories,
  bodyWeightKg,
  isDark,
  onToggleDark,
  reminderEnabled,
  reminderTime,
  onOpenReminder,
  onSaveCompletedSet,
}) => {
  const [reps, setReps] = useState(0);
  const [repsPerSet, setRepsPerSet] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('pushr_reps_per_set'));
      if ([0, 10, 15, 20, 25].includes(saved) && localStorage.getItem('pushr_reps_per_set') !== null) {
        return saved;
      }
    } catch {
      // default to 10 push-ups per set
    }
    return 10;
  });
  const [timerPresetSec, setTimerPresetSec] = useState<number>(60); // Default 60s countdown so timer end triggers burn/protein sheet
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [repPulseCount, setRepPulseCount] = useState(0);

  // Set complete sheet state
  const [modalOpen, setModalOpen] = useState(false);
  const [finishReason, setFinishReason] = useState<'rep_target' | 'timer_end' | 'manual_stop'>('manual_stop');

  // Optional camera proximity/motion auto-counter
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRepTimestampRef = useRef<number>(0);
  const baselineLumaRef = useRef<number | null>(null);
  const isDippingRef = useRef<boolean>(false);

  const lastTickRef = useRef<number | null>(null);
  const setNumber = todaySetsCount + 1;

  // Web Audio crisp tactile feedback beep (no external files)
  const playTone = useCallback(
    (freq: number, durationSec: number, gainPeak = 0.08) => {
      if (muted) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + durationSec + 0.02);
        setTimeout(() => {
          void ctx.close();
        }, (durationSec + 0.1) * 1000);
      } catch {
        // ignore WebAudio restrictions
      }
    },
    [muted]
  );

  const incrementRep = useCallback(() => {
    setReps((prev) => {
      const next = prev + 1;
      if (repsPerSet > 0 && next >= repsPerSet) {
        setIsRunning(false);
        setFinishReason('rep_target');
        setModalOpen(true);
        playTone(784, 0.18, 0.09);
        return repsPerSet;
      }
      setIsRunning(true);
      playTone(520, 0.07, 0.06);
      return next;
    });
    setRepPulseCount((c) => c + 1);
  }, [playTone, repsPerSet]);

  const decrementRep = useCallback(() => {
    setReps((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSelectRepsPerSet = (target: number) => {
    setRepsPerSet(target);
    try {
      localStorage.setItem('pushr_reps_per_set', String(target));
    } catch {
      // ignore
    }
    if (target > 0 && reps >= target) {
      setIsRunning(false);
      setReps(target);
      setFinishReason('rep_target');
      setModalOpen(true);
    }
  };

  // Precision 60fps timer loop
  useEffect(() => {
    if (!isRunning) {
      lastTickRef.current = null;
      return;
    }

    let rafId = 0;
    const tick = (now: number) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setElapsedMs((prev) => {
        const next = prev + delta;
        if (timerPresetSec > 0 && next >= timerPresetSec * 1000) {
          // Timer ended! Stop timer and present calorie burn + protein log summary
          setIsRunning(false);
          setFinishReason('timer_end');
          setModalOpen(true);
          playTone(880, 0.22, 0.1);
          return timerPresetSec * 1000;
        }
        return next;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isRunning, timerPresetSec, playTone]);

  // Keyboard shortcut: Spacebar to count a rep while on workout stage (when modal closed)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modalOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        incrementRep();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [incrementRep, modalOpen]);

  // Camera facial/proximity push-up motion tracking
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    baselineLumaRef.current = null;
    isDippingRef.current = false;
  }, []);

  const toggleCamera = useCallback(async () => {
    if (cameraActive) {
      stopCamera();
      setCameraNotice(null);
      return;
    }
    setCameraNotice(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraNotice('Camera sensor is unavailable in this browser. Tap the counter or press Space.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 160, height: 120 },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraNotice('Camera permission declined. Tap the big number or press Space to count reps.');
      stopCamera();
    }
  }, [cameraActive, stopCamera]);

  // Attach stream once video mounts
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [cameraActive]);

  // Analyze center-frame brightness proximity dip for push-up auto-counting
  useEffect(() => {
    if (!cameraActive) return;
    const interval = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 32, 24);
      const data = ctx.getImageData(8, 6, 16, 12).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuma = sum / (data.length / 4);

      if (baselineLumaRef.current === null) {
        baselineLumaRef.current = avgLuma;
        return;
      }

      // Smoothly adapt ambient baseline when not dipping
      if (!isDippingRef.current) {
        baselineLumaRef.current = baselineLumaRef.current * 0.92 + avgLuma * 0.08;
      }

      const dropRatio = (baselineLumaRef.current - avgLuma) / Math.max(18, baselineLumaRef.current);
      const now = Date.now();

      if (!isDippingRef.current && dropRatio > 0.22) {
        isDippingRef.current = true;
      } else if (isDippingRef.current && dropRatio < 0.08) {
        isDippingRef.current = false;
        if (now - lastRepTimestampRef.current > 650) {
          lastRepTimestampRef.current = now;
          incrementRep();
        }
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [cameraActive, incrementRep]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleStopOrFinish = () => {
    setIsRunning(false);
    if (reps > 0) {
      setFinishReason('manual_stop');
      setModalOpen(true);
    } else {
      setElapsedMs(0);
    }
  };

  const handleSelectTimerPreset = (seconds: number) => {
    setIsRunning(false);
    setElapsedMs(0);
    setTimerPresetSec(seconds);
  };

  const displayTimeMs =
    timerPresetSec > 0 ? Math.max(0, timerPresetSec * 1000 - elapsedMs) : elapsedMs;

  const liveSetCalories = calculatePushUpCalories(reps, activePushUpType, elapsedMs, bodyWeightKg);
  const cumulativeDisplayTotal = todayTotalReps + reps;
  const variationMeta = PUSH_UP_VARIATIONS[activePushUpType];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* LEFT / DOMINANT FOCAL ANCHOR: Exact Pushr Studio Counter Stage */}
      <section
        aria-label="Push-Up Counter Studio"
        className="lg:col-span-7 relative overflow-hidden rounded-[36px] pushr-spotlight border border-black/[0.08] dark:border-white/[0.08] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.18)] flex flex-col justify-between min-h-[560px] sm:min-h-[620px] p-5 sm:p-7 select-none"
      >
        {/* Top Row: Variation selector + Camera & Sound controls (matching Pushr top-right camera pill) */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Push-up muscle variation"
            className="flex items-center gap-1 p-1 rounded-full bg-black/[0.055] dark:bg-white/[0.08] backdrop-blur-md"
          >
            {PUSH_UP_ORDER.map((typeKey) => {
              const active = typeKey === activePushUpType;
              return (
                <button
                  key={typeKey}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChangePushUpType(typeKey)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#2C2C32] text-[#0A0A0C] dark:text-white shadow-sm'
                      : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#0A0A0C] dark:hover:text-white'
                  }`}
                >
                  {PUSH_UP_VARIATIONS[typeKey].label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenReminder}
              aria-label={
                reminderEnabled
                  ? `Daily reminder set for ${formatReminderTime12h(reminderTime)}`
                  : 'Set daily workout reminder'
              }
              title={
                reminderEnabled
                  ? `Daily reminder · ${formatReminderTime12h(reminderTime)}`
                  : 'Set daily workout reminder'
              }
              className={`w-11 h-11 rounded-full pushr-pill flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                reminderEnabled
                  ? 'text-[#0A0A0C] dark:text-white ring-2 ring-emerald-600/35 dark:ring-emerald-400/40'
                  : 'text-[#1C1C1E] dark:text-[#F5F5F7]'
              }`}
            >
              {reminderEnabled ? (
                <BellRing className="w-[18px] h-[18px]" />
              ) : (
                <Bell className="w-[18px] h-[18px]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Unmute sound' : 'Mute sound'}
              title={muted ? 'Unmute audio cues' : 'Mute audio cues'}
              className="w-11 h-11 rounded-full pushr-pill flex items-center justify-center text-[#1C1C1E] dark:text-[#F5F5F7] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {muted ? <VolumeX className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              aria-label={cameraActive ? 'Disable camera push-up tracker' : 'Enable camera push-up tracker'}
              title={cameraActive ? 'Turn off facial tracking' : 'Auto-count push-ups with camera'}
              className={`w-11 h-11 rounded-full pushr-pill flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                cameraActive
                  ? 'text-[#E53935] ring-2 ring-[#E53935]/40'
                  : 'text-[#1C1C1E] dark:text-[#F5F5F7]'
              }`}
            >
              {cameraActive ? <CameraOff className="w-[18px] h-[18px]" /> : <Camera className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        {/* Optional Camera PIP preview when active */}
        {cameraActive && (
          <div className="relative z-10 mt-3 self-end flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-black/80 text-white text-xs">
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-11 h-8 rounded-lg object-cover bg-black"
            />
            <canvas ref={canvasRef} width={32} height={24} className="hidden" />
            <span>Face proximity auto-count active</span>
          </div>
        )}

        {cameraNotice && (
          <p className="relative z-10 mt-2 text-center text-xs text-[#6E6E73] dark:text-[#A1A1AA]">
            {cameraNotice}
          </p>
        )}

        {/* CENTERPIECE: Giant Pushr Counter + Soft Floor Reflection */}
        <div
          role="button"
          tabIndex={0}
          onClick={incrementRep}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              incrementRep();
            }
          }}
          aria-label="Count one push-up rep"
          className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 cursor-pointer group focus:outline-none"
        >
          <div className="flex flex-col items-center gap-1.5 mb-1">
            <span className="font-sf-display text-xs sm:text-sm font-semibold tracking-[0.14em] text-[#52525B] dark:text-[#A1A1AA] tabular-nums">
              {repsPerSet > 0 ? `SET ${setNumber} · ${reps} / ${repsPerSet}` : `SET ${setNumber}`}
            </span>

            {repsPerSet > 0 && (
              <div
                aria-label={`Set ${setNumber} progress: ${reps} of ${repsPerSet} push-ups`}
                className="w-36 h-1 rounded-full bg-black/[0.08] dark:bg-white/[0.12] overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-[#0A0A0C] dark:bg-white transition-all duration-200"
                  style={{ width: `${Math.min(100, Math.round((reps / repsPerSet) * 100))}%` }}
                />
              </div>
            )}
          </div>

          {/* Primary High-Contrast SF Pro Display Numeral */}
          <div className="relative flex flex-col items-center">
            <span
              key={reps}
              className="font-sf-display font-bold tabular-nums leading-[0.9] tracking-[-0.04em] text-[#050507] dark:text-white transition-transform duration-150 group-active:scale-[0.96]"
              style={{ fontSize: 'clamp(6.5rem, 15vw, 9.5rem)' }}
            >
              {reps}
            </span>

            {/* Signature Pushr Soft Floor Reflection */}
            <span
              aria-hidden="true"
              className="font-sf-display font-bold tabular-nums leading-[0.86] tracking-[-0.04em] text-[#050507] dark:text-white pushr-reflection -mt-1"
              style={{ fontSize: 'clamp(6.5rem, 15vw, 9.5rem)' }}
            >
              {reps}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                decrementRep();
              }}
              aria-label="Subtract 1 rep"
              className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center text-[#52525B] dark:text-[#D4D4D8] hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
              {repsPerSet > 0
                ? `${Math.max(0, repsPerSet - reps)} left for Set ${setNumber} · ${liveSetCalories.toFixed(1)} kcal`
                : `Tap number or press Space · ${liveSetCalories.toFixed(1)} kcal`}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                incrementRep();
              }}
              aria-label="Add 1 rep"
              className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center text-[#52525B] dark:text-[#D4D4D8] hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* BOTTOM CONTROLS: Exact 2-Row Pushr Frosted Pill Cluster */}
        <div className="relative z-10 flex flex-col items-center gap-3 pb-1">
          {/* Reps-per-Set & Timer Duration Selectors */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div
              role="group"
              aria-label="Push-ups per set"
              className="flex items-center gap-0.5 p-1 rounded-full bg-black/[0.045] dark:bg-white/[0.06]"
            >
              {REP_TARGET_PRESETS.map((opt) => {
                const active = repsPerSet === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleSelectRepsPerSet(opt.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#2C2C32] text-[#0A0A0C] dark:text-white shadow-xs'
                        : 'text-[#6E6E73] dark:text-[#9898A0] hover:text-[#0A0A0C] dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label="Timer duration"
              className="flex items-center gap-0.5 p-1 rounded-full bg-black/[0.045] dark:bg-white/[0.06]"
            >
              {TIMER_PRESETS.map((preset) => {
                const active = timerPresetSec === preset.seconds;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectTimerPreset(preset.seconds)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-[#2C2C32] text-[#0A0A0C] dark:text-white shadow-xs'
                        : 'text-[#6E6E73] dark:text-[#9898A0] hover:text-[#0A0A0C] dark:hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 1 (Exact Screenshot Match): Moon Toggle + TOTAL pill */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={isDark ? 'Switch to light studio mode' : 'Switch to dark studio mode'}
              className="w-14 h-14 rounded-full pushr-pill flex items-center justify-center text-[#0A0A0C] dark:text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 fill-current" />}
            </button>

            <div className="h-14 px-7 rounded-full pushr-pill flex items-center justify-center gap-2">
              <span className="text-xs font-semibold tracking-[0.06em] text-[#6E6E73] dark:text-[#A1A1AA]">
                TOTAL
              </span>
              <span className="font-sf-display text-lg font-bold tabular-nums text-[#0A0A0C] dark:text-white">
                {cumulativeDisplayTotal}
              </span>
            </div>
          </div>

          {/* Row 2 (Exact Screenshot Match): Stopwatch/Timer Pill + Pause/Play Circle + Vibrant Red Stop Circle */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-14 px-6 rounded-full pushr-pill flex items-center justify-center gap-2.5 min-w-[164px]">
              <Timer className="w-4 h-4 text-[#8E8E93]" />
              <span className="font-sf-mono text-base font-semibold tabular-nums text-[#1C1C1E] dark:text-white">
                {formatStopwatch(displayTimeMs)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              aria-label={isRunning ? 'Pause timer' : 'Start timer'}
              className="w-14 h-14 rounded-full pushr-pill flex items-center justify-center text-[#0A0A0C] dark:text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              {isRunning ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleStopOrFinish}
              aria-label={reps > 0 ? 'Finish set and view calorie burn' : 'Reset timer'}
              title={reps > 0 ? 'Finish set, see calories burned & log protein' : 'Reset timer'}
              className="w-14 h-14 rounded-full pushr-stop-btn flex items-center justify-center text-white hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN ON DESKTOP: Live Push-Up Animation + Real-Time Calorie Burn Equivalent */}
      <aside className="lg:col-span-5 flex flex-col gap-5 justify-between">
        {/* Live Synced Push-Up Animation Card */}
        <div className="rounded-3xl bg-white/85 dark:bg-[#17171B]/90 border border-black/[0.06] dark:border-white/[0.08] p-5 flex-1 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
                Live Form Guide · {variationMeta.label}
              </p>
              <h2 className="font-sf-display text-xl font-bold tracking-tight text-[#0A0A0C] dark:text-white">
                {variationMeta.variationName}
              </h2>
            </div>
            <span className="text-xs font-sf-mono tabular-nums text-[#6E6E73] dark:text-[#9898A0] shrink-0">
              {variationMeta.kcalMultiplier.toFixed(2)}× burn
            </span>
          </div>

          <PushUpAnimation
            type={activePushUpType}
            autoPlay={!isRunning}
            repTrigger={repPulseCount}
            speed={1}
          />

          <p className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6E6E73] dark:text-[#9898A0] leading-relaxed">
            {variationMeta.cues[0]}
          </p>
        </div>

        {/* Live Calorie Burn Equivalent Widget (200 kcal Coke etc.) */}
        <CalorieBurnEquivalents
          totalKcal={todayTotalCalories + liveSetCalories}
          setKcal={liveSetCalories}
        />
      </aside>

      {/* Post-Timer-End / Set-Finish Modal */}
      <SetCompleteModal
        isOpen={modalOpen}
        setNumber={setNumber}
        pushUpType={activePushUpType}
        reps={Math.max(1, reps)}
        durationMs={elapsedMs}
        setCalories={calculatePushUpCalories(Math.max(1, reps), activePushUpType, elapsedMs, bodyWeightKg)}
        todayTotalCaloriesAfterSet={
          todayTotalCalories +
          calculatePushUpCalories(Math.max(1, reps), activePushUpType, elapsedMs, bodyWeightKg)
        }
        targetReps={repsPerSet}
        reason={finishReason}
        onSaveAndClose={async ({ notes, selectedProteinFoods }) => {
          await onSaveCompletedSet({
            pushUpType: activePushUpType,
            reps: Math.max(1, reps),
            durationMs: elapsedMs,
            notes,
            selectedProteinFoods,
          });
          setModalOpen(false);
          setReps(0);
          setElapsedMs(0);
          setIsRunning(false);
        }}
        onDiscard={() => {
          setModalOpen(false);
          setReps(0);
          setElapsedMs(0);
          setIsRunning(false);
        }}
      />
    </div>
  );
};
