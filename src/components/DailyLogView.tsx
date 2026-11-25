import React, { useMemo, useState } from 'react';
import { Bell, BellRing, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  formatReminderTime12h,
  formatShortDate,
  formatStopwatch,
  getLocalDateKey,
  getPastDateKeys,
  PROTEIN_FOOD_PRESETS,
  ProteinLog,
  PUSH_UP_ORDER,
  PUSH_UP_VARIATIONS,
  PushUpType,
  UserProfile,
  WorkoutSet,
} from '../types';
import { CalorieBurnEquivalents } from './CalorieBurnEquivalents';

interface DailyLogViewProps {
  workoutSets: WorkoutSet[];
  proteinLogs: ProteinLog[];
  profile: UserProfile;
  onAddWorkoutSet: (input: {
    pushUpType: PushUpType;
    reps: number;
    durationMs: number;
    notes?: string;
    dateKey?: string;
  }) => Promise<WorkoutSet>;
  onDeleteWorkoutSet: (id: string) => Promise<void>;
  onAddProteinLog: (input: {
    foodName: string;
    serving: string;
    proteinGrams: number;
    calories: number;
    dateKey?: string;
  }) => Promise<ProteinLog>;
  onDeleteProteinLog: (id: string) => Promise<void>;
  onUpdateTargets: (updates: {
    dailyRepGoal: number;
    dailyProteinGoal: number;
    bodyWeightKg: number;
  }) => Promise<void>;
  onOpenReminder: () => void;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  workoutSets,
  proteinLogs,
  profile,
  onAddWorkoutSet,
  onDeleteWorkoutSet,
  onAddProteinLog,
  onDeleteProteinLog,
  onUpdateTargets,
  onOpenReminder,
}) => {
  const recentDates = useMemo(() => getPastDateKeys(7), []);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateKey());

  // Quick manual set form state
  const [showAddSet, setShowAddSet] = useState(false);
  const [manualType, setManualType] = useState<PushUpType>('shoulder');
  const [manualReps, setManualReps] = useState('25');
  const [manualSeconds, setManualSeconds] = useState('30');
  const [manualNotes, setManualNotes] = useState('');

  // Custom protein form state
  const [showCustomProtein, setShowCustomProtein] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [serving, setServing] = useState('1 serving');
  const [proteinGrams, setProteinGrams] = useState('');
  const [foodCalories, setFoodCalories] = useState('');

  // Targets editor toggle
  const [showTargets, setShowTargets] = useState(false);
  const [repGoalInput, setRepGoalInput] = useState(String(profile.dailyRepGoal));
  const [proteinGoalInput, setProteinGoalInput] = useState(String(profile.dailyProteinGoal));
  const [weightInput, setWeightInput] = useState(String(profile.bodyWeightKg));

  const daySets = useMemo(
    () => workoutSets.filter((s) => s.dateKey === selectedDate),
    [workoutSets, selectedDate]
  );
  const dayProtein = useMemo(
    () => proteinLogs.filter((p) => p.dateKey === selectedDate),
    [proteinLogs, selectedDate]
  );

  const totalReps = daySets.reduce((sum, s) => sum + s.reps, 0);
  const totalCaloriesBurned = daySets.reduce((sum, s) => sum + s.caloriesBurned, 0);
  const totalProtein = dayProtein.reduce((sum, p) => sum + p.proteinGrams, 0);
  const totalFoodCalories = dayProtein.reduce((sum, p) => sum + p.calories, 0);

  const repProgressPct = Math.min(100, Math.round((totalReps / Math.max(1, profile.dailyRepGoal)) * 100));
  const proteinProgressPct = Math.min(
    100,
    Math.round((totalProtein / Math.max(1, profile.dailyProteinGoal)) * 100)
  );
  const dateInfo = formatShortDate(selectedDate);

  const handleManualSetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const repsVal = Math.max(1, Number(manualReps) || 0);
    const durationVal = Math.max(0, (Number(manualSeconds) || 0) * 1000);
    await onAddWorkoutSet({
      pushUpType: manualType,
      reps: repsVal,
      durationMs: durationVal,
      notes: manualNotes,
      dateKey: selectedDate,
    });
    setManualNotes('');
    setShowAddSet(false);
  };

  const handleCustomProteinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;
    await onAddProteinLog({
      foodName,
      serving: serving || '1 serving',
      proteinGrams: Number(proteinGrams) || 0,
      calories: Number(foodCalories) || 0,
      dateKey: selectedDate,
    });
    setFoodName('');
    setServing('1 serving');
    setProteinGrams('');
    setFoodCalories('');
    setShowCustomProtein(false);
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateTargets({
      dailyRepGoal: Number(repGoalInput) || profile.dailyRepGoal,
      dailyProteinGoal: Number(proteinGoalInput) || profile.dailyProteinGoal,
      bodyWeightKg: Number(weightInput) || profile.bodyWeightKg,
    });
    setShowTargets(false);
  };

  return (
    <div className="space-y-6">
      {/* Header + Date Scroller */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            Daily Progress Log · {dateInfo.full}
          </p>
          <h1 className="font-sf-display text-3xl font-bold tracking-tight text-[#0A0A0C] dark:text-white mt-0.5">
            Sets, Calorie Burn & Protein Intake
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={onOpenReminder}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-[#19191E] border border-black/[0.08] dark:border-white/[0.09] text-xs font-semibold text-[#0A0A0C] dark:text-white hover:bg-white dark:hover:bg-[#222228] transition-colors cursor-pointer whitespace-nowrap"
          >
            {profile.reminderEnabled ? (
              <BellRing className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            {profile.reminderEnabled
              ? `Reminder · ${formatReminderTime12h(profile.reminderTime)}`
              : 'Daily Reminder'}
          </button>

          <button
            type="button"
            onClick={() => {
              setRepGoalInput(String(profile.dailyRepGoal));
              setProteinGoalInput(String(profile.dailyProteinGoal));
              setWeightInput(String(profile.bodyWeightKg));
              setShowTargets((v) => !v);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 dark:bg-[#19191E] border border-black/[0.08] dark:border-white/[0.09] text-xs font-semibold text-[#0A0A0C] dark:text-white hover:bg-white dark:hover:bg-[#222228] transition-colors cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Goals & Weight ({profile.bodyWeightKg} kg)
          </button>
        </div>
      </div>

      {/* Collapsible Goals & Body Weight Form */}
      {showTargets && (
        <form
          onSubmit={handleSaveTargets}
          className="rounded-3xl bg-white dark:bg-[#17171B] border border-black/[0.08] dark:border-white/[0.09] p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label htmlFor="rep-goal" className="block text-xs font-medium text-[#6E6E73] dark:text-[#9898A0] mb-1.5">
              Daily Push-Up Goal
            </label>
            <input
              id="rep-goal"
              type="number"
              min={BLUEPRINT_LIMITS.minDailyRepGoal}
              max={BLUEPRINT_LIMITS.maxDailyRepGoal}
              value={repGoalInput}
              onChange={(e) => setRepGoalInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#222228] text-sm font-semibold tabular-nums text-[#0A0A0C] dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="protein-goal" className="block text-xs font-medium text-[#6E6E73] dark:text-[#9898A0] mb-1.5">
              Daily Protein Goal (g)
            </label>
            <input
              id="protein-goal"
              type="number"
              min={BLUEPRINT_LIMITS.minDailyProteinGoal}
              max={BLUEPRINT_LIMITS.maxDailyProteinGoal}
              value={proteinGoalInput}
              onChange={(e) => setProteinGoalInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#222228] text-sm font-semibold tabular-nums text-[#0A0A0C] dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="body-weight" className="block text-xs font-medium text-[#6E6E73] dark:text-[#9898A0] mb-1.5">
              Body Weight (kg)
            </label>
            <input
              id="body-weight"
              type="number"
              min={BLUEPRINT_LIMITS.minBodyWeightKg}
              max={BLUEPRINT_LIMITS.maxBodyWeightKg}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#222228] text-sm font-semibold tabular-nums text-[#0A0A0C] dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Save Targets
          </button>
        </form>
      )}

      {/* Horizontal 7-Day Date Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {recentDates.map((dKey) => {
          const info = formatShortDate(dKey);
          const active = dKey === selectedDate;
          const dayReps = workoutSets
            .filter((s) => s.dateKey === dKey)
            .reduce((sum, s) => sum + s.reps, 0);

          return (
            <button
              key={dKey}
              type="button"
              onClick={() => setSelectedDate(dKey)}
              className={`min-w-[74px] flex-1 py-2.5 px-3 rounded-2xl border transition-all flex flex-col items-center cursor-pointer shrink-0 ${
                active
                  ? 'bg-[#0A0A0C] text-white border-[#0A0A0C] dark:bg-white dark:text-[#0A0A0C] dark:border-white shadow-sm'
                  : 'bg-white/80 dark:bg-[#17171B] border-black/[0.06] dark:border-white/[0.07] text-[#3A3A40] dark:text-[#D4D4D8] hover:bg-white dark:hover:bg-[#1F1F25]'
              }`}
            >
              <span className={`text-[11px] font-medium ${active ? 'opacity-80' : 'text-[#6E6E73] dark:text-[#9898A0]'}`}>
                {info.weekday}
              </span>
              <span className="font-sf-display text-lg font-bold tabular-nums leading-tight mt-0.5">
                {info.day}
              </span>
              <span className={`text-[10px] font-sf-mono tabular-nums mt-0.5 ${active ? 'opacity-85' : 'text-[#8E8E93]'}`}>
                {dayReps} reps
              </span>
            </button>
          );
        })}
      </div>

      {/* 4-Column Full-Width KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">Push-Ups</p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-1">
            {totalReps}
            <span className="text-sm font-medium text-[#8E8E93]"> / {profile.dailyRepGoal}</span>
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0A0A0C] dark:bg-white transition-all duration-300"
              style={{ width: `${repProgressPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">Calories Burned</p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#E53935] mt-1">
            {totalCaloriesBurned.toFixed(1)}
            <span className="text-sm font-medium text-[#8E8E93]"> kcal</span>
          </p>
          <p className="mt-2.5 text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
            {(totalCaloriesBurned / 200).toFixed(2)}× 500 ml Coke (200 kcal)
          </p>
        </div>

        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">Post-Workout Protein</p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-1">
            {Math.round(totalProtein)}g
            <span className="text-sm font-medium text-[#8E8E93]"> / {profile.dailyProteinGoal}g</span>
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300"
              style={{ width: `${proteinProgressPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">Sets & Nutrition</p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-1">
            {daySets.length}
            <span className="text-sm font-medium text-[#8E8E93]"> sets</span>
          </p>
          <p className="mt-2.5 text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
            {dayProtein.length} meals · {totalFoodCalories} kcal intake
          </p>
        </div>
      </div>

      {/* Main 2-Column Daily Log Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Push-Up Sets & Calorie Burn Equivalent */}
        <div className="lg:col-span-6 space-y-5">
          <CalorieBurnEquivalents totalKcal={totalCaloriesBurned} />

          <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-sf-display text-lg font-bold text-[#0A0A0C] dark:text-white">
                  Completed Push-Up Sets
                </h2>
                <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">
                  {daySets.length} {daySets.length === 1 ? 'set' : 'sets'} logged on {dateInfo.weekday}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSet((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-xs font-semibold text-[#0A0A0C] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Set
              </button>
            </div>

            {showAddSet && (
              <form
                onSubmit={handleManualSetSubmit}
                className="mb-4 p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#1F1F25] space-y-3"
              >
                <div className="grid grid-cols-3 gap-2.5">
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as PushUpType)}
                    aria-label="Push-up type"
                    className="px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs font-medium text-[#0A0A0C] dark:text-white"
                  >
                    {PUSH_UP_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {PUSH_UP_VARIATIONS[k].label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={BLUEPRINT_LIMITS.maxReps}
                    value={manualReps}
                    onChange={(e) => setManualReps(e.target.value)}
                    placeholder="Reps"
                    className="px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs font-medium tabular-nums text-[#0A0A0C] dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    max={3600}
                    value={manualSeconds}
                    onChange={(e) => setManualSeconds(e.target.value)}
                    placeholder="Seconds"
                    className="px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs font-medium tabular-nums text-[#0A0A0C] dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={manualNotes}
                    maxLength={BLUEPRINT_LIMITS.notesMaxLength}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Optional note"
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs text-[#0A0A0C] dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {daySets.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-[#6E6E73] dark:text-[#9898A0]">
                  No push-up sets recorded for {dateInfo.weekday.toLowerCase()}.
                </p>
                <p className="text-xs text-[#8E8E93] mt-1">
                  Complete a set in the Timer Studio or tap Log Set above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                {daySets.map((set) => {
                  const meta = PUSH_UP_VARIATIONS[set.pushUpType] || PUSH_UP_VARIATIONS.shoulder;
                  const cokePct = Math.round((set.caloriesBurned / 200) * 100);
                  return (
                    <div key={set.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-sf-display text-base font-bold tabular-nums text-[#0A0A0C] dark:text-white">
                            {set.reps} reps
                          </span>
                          <span className="text-xs text-[#6E6E73] dark:text-[#9898A0]">
                            · {meta.label} ({meta.variationName})
                          </span>
                        </div>
                        <p className="text-xs text-[#6E6E73] dark:text-[#9898A0] mt-0.5 tabular-nums">
                          Set {set.setNumber} · {formatStopwatch(set.durationMs)} ·{' '}
                          <span className="text-[#E53935] font-medium">{set.caloriesBurned.toFixed(1)} kcal</span>{' '}
                          ({cokePct}% of 200 kcal Coke)
                        </p>
                        {set.notes && (
                          <p className="text-xs text-[#8E8E93] mt-0.5 truncate">{set.notes}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteWorkoutSet(set.id)}
                        aria-label="Delete workout set"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#E53935] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Post-Push-Up Protein Food Tracker */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div>
                <h2 className="font-sf-display text-lg font-bold text-[#0A0A0C] dark:text-white">
                  Protein Foods After Push-Ups
                </h2>
                <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">
                  Tap any post-workout food to add to {dateInfo.weekday}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomProtein((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-xs font-semibold text-[#0A0A0C] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Custom Food
              </button>
            </div>

            {showCustomProtein && (
              <form
                onSubmit={handleCustomProteinSubmit}
                className="mb-4 p-4 rounded-2xl bg-[#F5F5F7] dark:bg-[#1F1F25] grid grid-cols-2 gap-2.5"
              >
                <input
                  type="text"
                  required
                  placeholder="Food name (e.g. Grilled Salmon)"
                  maxLength={BLUEPRINT_LIMITS.foodNameMaxLength}
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="col-span-2 px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs text-[#0A0A0C] dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Serving (e.g. 150g)"
                  maxLength={BLUEPRINT_LIMITS.servingMaxLength}
                  value={serving}
                  onChange={(e) => setServing(e.target.value)}
                  className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs text-[#0A0A0C] dark:text-white"
                />
                <input
                  type="number"
                  required
                  min={0}
                  max={BLUEPRINT_LIMITS.maxProteinGrams}
                  placeholder="Protein (g)"
                  value={proteinGrams}
                  onChange={(e) => setProteinGrams(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs tabular-nums text-[#0A0A0C] dark:text-white"
                />
                <input
                  type="number"
                  min={0}
                  max={BLUEPRINT_LIMITS.maxFoodCalories}
                  placeholder="Calories (kcal)"
                  value={foodCalories}
                  onChange={(e) => setFoodCalories(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-[#2A2A32] text-xs tabular-nums text-[#0A0A0C] dark:text-white"
                />
                <button
                  type="submit"
                  className="col-span-2 py-2.5 rounded-xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-xs font-semibold cursor-pointer"
                >
                  Save Protein Food
                </button>
              </form>
            )}

            {/* Quick-Add Protein Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
              {PROTEIN_FOOD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    void onAddProteinLog({
                      foodName: preset.foodName,
                      serving: preset.serving,
                      proteinGrams: preset.proteinGrams,
                      calories: preset.calories,
                      dateKey: selectedDate,
                    })
                  }
                  className="flex items-center justify-between text-left px-3.5 py-2.5 rounded-2xl bg-[#F5F5F7] dark:bg-[#1F1F25] hover:bg-black/[0.08] dark:hover:bg-white/[0.11] transition-colors min-h-[52px] cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-[#0A0A0C] dark:text-white truncate">
                      {preset.foodName}
                    </p>
                    <p className="text-[11px] text-[#6E6E73] dark:text-[#9898A0] truncate">
                      {preset.serving} · {preset.calories} kcal
                    </p>
                  </div>
                  <span className="font-sf-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                    +{preset.proteinGrams}g
                  </span>
                </button>
              ))}
            </div>

            {/* Logged Protein Foods for Selected Day */}
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              <h3 className="text-xs font-semibold text-[#6E6E73] dark:text-[#9898A0] mb-2">
                Logged on {dateInfo.weekday} ({Math.round(totalProtein)}g total)
              </h3>
              {dayProtein.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#8E8E93]">
                  No post-workout protein logged yet for this day.
                </p>
              ) : (
                <div className="divide-y divide-black/[0.06] dark:divide-white/[0.07]">
                  {dayProtein.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0A0A0C] dark:text-white truncate">
                          {item.foodName}
                        </p>
                        <p className="text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
                          {item.serving} · {item.proteinGrams}g protein · {item.calories} kcal
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteProteinLog(item.id)}
                        aria-label={`Remove ${item.foodName}`}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#8E8E93] hover:text-[#E53935] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
