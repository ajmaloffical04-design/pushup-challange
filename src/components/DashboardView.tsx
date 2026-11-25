import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CALORIE_EQUIVALENTS,
  formatShortDate,
  getPastDateKeys,
  ProteinLog,
  PUSH_UP_ORDER,
  PUSH_UP_VARIATIONS,
  PushUpType,
  UserProfile,
  WorkoutSet,
} from '../types';

interface DashboardViewProps {
  workoutSets: WorkoutSet[];
  proteinLogs: ProteinLog[];
  profile: UserProfile;
  isDark: boolean;
}

type RangeDays = 7 | 14 | 30;

export const DashboardView: React.FC<DashboardViewProps> = ({
  workoutSets,
  proteinLogs,
  profile,
  isDark,
}) => {
  const [rangeDays, setRangeDays] = useState<RangeDays>(7);

  const dateKeys = useMemo(() => getPastDateKeys(rangeDays), [rangeDays]);

  const seriesData = useMemo(() => {
    return dateKeys.map((dateKey) => {
      const sets = workoutSets.filter((s) => s.dateKey === dateKey);
      const foods = proteinLogs.filter((p) => p.dateKey === dateKey);
      const reps = sets.reduce((sum, s) => sum + s.reps, 0);
      const caloriesBurned = Math.round(sets.reduce((sum, s) => sum + s.caloriesBurned, 0) * 10) / 10;
      const proteinGrams = Math.round(foods.reduce((sum, f) => sum + f.proteinGrams, 0));
      const { weekday, day } = formatShortDate(dateKey);
      return {
        dateKey,
        label: rangeDays === 7 ? weekday : `${dateKey.slice(5, 7)}/${day}`,
        reps,
        setsCount: sets.length,
        caloriesBurned,
        proteinGrams,
      };
    });
  }, [dateKeys, workoutSets, proteinLogs, rangeDays]);

  const periodTotalReps = seriesData.reduce((sum, d) => sum + d.reps, 0);
  const periodTotalCalories = seriesData.reduce((sum, d) => sum + d.caloriesBurned, 0);
  const periodActiveDays = seriesData.filter((d) => d.reps > 0).length;
  const periodAvgProtein =
    periodActiveDays > 0
      ? Math.round(
          seriesData.reduce((sum, d) => sum + d.proteinGrams, 0) /
            Math.max(1, seriesData.filter((d) => d.proteinGrams > 0).length)
        )
      : 0;

  // All-time career totals & streak
  const allTimeReps = workoutSets.reduce((sum, s) => sum + s.reps, 0);
  const bestSingleSet = workoutSets.reduce((max, s) => Math.max(max, s.reps), 0);

  const currentStreak = useMemo(() => {
    const activeDates = new Set(workoutSets.map((s) => s.dateKey));
    const keys = getPastDateKeys(60).reverse();
    let streak = 0;
    for (let i = 0; i < keys.length; i++) {
      if (activeDates.has(keys[i])) {
        streak++;
      } else if (i === 0) {
        // Allow streak to continue if today hasn't been logged yet
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [workoutSets]);

  // Growth delta: second half vs first half of period
  const growthDeltaPct = useMemo(() => {
    const half = Math.floor(seriesData.length / 2);
    const firstHalf = seriesData.slice(0, half).reduce((sum, d) => sum + d.reps, 0);
    const secondHalf = seriesData.slice(half).reduce((sum, d) => sum + d.reps, 0);
    if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
  }, [seriesData]);

  // Muscle variation breakdown across selected timeframe
  const muscleDistribution = useMemo(() => {
    const keySet = new Set(dateKeys);
    const counts: Record<PushUpType, number> = {
      shoulder: 0,
      bicep: 0,
      tricep: 0,
      wings: 0,
    };
    for (const s of workoutSets) {
      if (keySet.has(s.dateKey) && counts[s.pushUpType] !== undefined) {
        counts[s.pushUpType] += s.reps;
      }
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return PUSH_UP_ORDER.map((typeKey) => ({
      type: typeKey,
      label: PUSH_UP_VARIATIONS[typeKey].label,
      variationName: PUSH_UP_VARIATIONS[typeKey].variationName,
      accentColor: PUSH_UP_VARIATIONS[typeKey].accentColor,
      reps: counts[typeKey],
      pct: total > 0 ? Math.round((counts[typeKey] / total) * 100) : 0,
    }));
  }, [workoutSets, dateKeys]);

  const axisColor = isDark ? '#71717A' : '#8E8E93';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? '#18181B' : '#FFFFFF';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const primaryStroke = isDark ? '#FFFFFF' : '#0A0A0C';

  return (
    <div className="space-y-6">
      {/* Header + Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            Historical Analytics
          </p>
          <h1 className="font-sf-display text-3xl font-bold tracking-tight text-[#0A0A0C] dark:text-white mt-0.5">
            Growth Over Time
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="Analytics timeframe"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] self-start sm:self-auto"
        >
          {([7, 14, 30] as RangeDays[]).map((days) => (
            <button
              key={days}
              type="button"
              role="tab"
              aria-selected={rangeDays === days}
              onClick={() => setRangeDays(days)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                rangeDays === days
                  ? 'bg-white dark:bg-[#2C2C32] text-[#0A0A0C] dark:text-white shadow-sm'
                  : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#0A0A0C] dark:hover:text-white'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* 4-Column Growth KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            {rangeDays}-Day Volume
          </p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-1">
            {periodTotalReps.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
            {growthDeltaPct >= 0 ? `+${growthDeltaPct}%` : `${growthDeltaPct}%`} pace · {allTimeReps.toLocaleString()} all-time
          </p>
        </div>

        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            Calories Burned
          </p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#E53935] mt-1">
            {periodTotalCalories.toFixed(0)}
            <span className="text-sm font-medium text-[#8E8E93]"> kcal</span>
          </p>
          <p className="mt-2 text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
            {(periodTotalCalories / 200).toFixed(2)}× 200 kcal Coca-Colas
          </p>
        </div>

        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            Active Streak & Record
          </p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-1">
            {currentStreak}
            <span className="text-sm font-medium text-[#8E8E93]"> {currentStreak === 1 ? 'day' : 'days'}</span>
          </p>
          <p className="mt-2 text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
            Best single set: {bestSingleSet} reps
          </p>
        </div>

        <div className="rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
          <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
            Avg Post-Workout Protein
          </p>
          <p className="font-sf-display text-3xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-1">
            {periodAvgProtein}g
          </p>
          <p className="mt-2 text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
            Target: {profile.dailyProteinGoal}g / active day
          </p>
        </div>
      </div>

      {/* Row 1 Charts: Push-Up Volume Curve + Muscle Focus Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-6">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="font-sf-display text-lg font-bold text-[#0A0A0C] dark:text-white">
                Daily Push-Up Volume
              </h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">
                Reps completed per day across the last {rangeDays} days
              </p>
            </div>
            <span className="font-sf-mono text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
              Goal: {profile.dailyRepGoal} reps
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="repsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primaryStroke} stopOpacity={isDark ? 0.28 : 0.16} />
                    <stop offset="100%" stopColor={primaryStroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '14px',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}
                />
                <ReferenceLine
                  y={profile.dailyRepGoal}
                  stroke="#E53935"
                  strokeDasharray="4 4"
                  strokeOpacity={0.55}
                />
                <Area
                  type="monotone"
                  dataKey="reps"
                  name="Push-Ups"
                  stroke={primaryStroke}
                  strokeWidth={2.5}
                  fill="url(#repsAreaGrad)"
                  activeDot={{ r: 5, fill: '#E53935', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Muscle Focus Balance */}
        <div className="lg:col-span-4 rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-sf-display text-lg font-bold text-[#0A0A0C] dark:text-white">
              Muscle Split
            </h2>
            <p className="text-xs text-[#6E6E73] dark:text-[#9898A0] mb-5">
              Shoulder · Bicep · Tricep · Wings volume
            </p>

            <div className="space-y-4">
              {muscleDistribution.map((item) => (
                <div key={item.type}>
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-semibold text-[#0A0A0C] dark:text-white">
                      {item.label}{' '}
                      <span className="font-normal text-[#8E8E93]">({item.variationName})</span>
                    </span>
                    <span className="font-sf-mono tabular-nums text-[#52525B] dark:text-[#D4D4D8]">
                      {item.reps} · {item.pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(item.reps > 0 ? 4 : 0, item.pct)}%`,
                        backgroundColor: item.accentColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
            <p className="text-xs text-[#6E6E73] dark:text-[#9898A0] leading-relaxed">
              Rotate all 4 push-up variations weekly for balanced upper-body hypertrophy across deltoids, arms, and lats.
            </p>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Calorie Burn Equivalents + Post-Workout Protein Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Daily Calories Burned + Cumulative Drink/Food Burn Ledger */}
        <div className="lg:col-span-6 rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-6">
          <div className="mb-4">
            <h2 className="font-sf-display text-lg font-bold text-[#0A0A0C] dark:text-white">
              Calorie Burn & Everyday Equivalents
            </h2>
            <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">
              {periodTotalCalories.toFixed(1)} kcal burned in the last {rangeDays} days
            </p>
          </div>

          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '14px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="caloriesBurned"
                  name="kcal burned"
                  fill="#E53935"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Everyday Burned Food/Drink Conversion Ledger */}
          <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CALORIE_EQUIVALENTS.slice(0, 3).map((item) => {
              const count = periodTotalCalories / item.kcal;
              return (
                <div key={item.id} className="rounded-2xl bg-[#F5F5F7] dark:bg-[#1F1F25] p-3">
                  <p className="font-sf-display text-lg font-bold tabular-nums text-[#0A0A0C] dark:text-white">
                    {count.toFixed(2)}×
                  </p>
                  <p className="text-[11px] font-medium text-[#52525B] dark:text-[#D4D4D8] truncate">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-[#8E8E93] tabular-nums">
                    {item.kcal} kcal · {item.serving}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Post-Workout Protein Intake Trend */}
        <div className="lg:col-span-6 rounded-3xl bg-white/90 dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-sf-display text-lg font-bold text-[#0A0A0C] dark:text-white">
                  Protein Recovery Trend
                </h2>
                <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">
                  Daily post-push-up protein intake (g) vs {profile.dailyProteinGoal}g target
                </p>
              </div>
            </div>

            <div className="h-[235px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriesData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="label" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: '14px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine
                    y={profile.dailyProteinGoal}
                    stroke="#10B981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.65}
                  />
                  <Bar
                    dataKey="proteinGrams"
                    name="Protein (g)"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] text-xs text-[#6E6E73] dark:text-[#9898A0]">
            Consistent post-workout protein alongside progressive push-up volume accelerates strength gains.
          </p>
        </div>
      </div>
    </div>
  );
};
