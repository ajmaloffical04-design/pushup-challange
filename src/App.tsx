import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, BellRing, ClipboardList, LogIn, LogOut, Timer, X } from 'lucide-react';
import { AnimationsView } from './components/AnimationsView';
import { DailyLogView } from './components/DailyLogView';
import { DailyReminderModal } from './components/DailyReminderModal';
import { DashboardView } from './components/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TimerStudio } from './components/TimerStudio';
import { useDailyReminder } from './hooks/useDailyReminder';
import { usePushrData } from './hooks/usePushrData';
import { formatReminderTime12h, getLocalDateKey, NavTab, PushUpType } from './types';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'workout', label: 'Workout', icon: Timer },
  { id: 'animations', label: 'Animations', icon: Activity },
  { id: 'log', label: 'Daily Log', icon: ClipboardList },
  { id: 'dashboard', label: 'Progress', icon: BarChart3 },
];

function PushrAppContent() {
  const {
    user,
    authError,
    syncing,
    profile,
    workoutSets,
    proteinLogs,
    signIn,
    signOut,
    updateProfileTargets,
    updateReminderSettings,
    addWorkoutSet,
    deleteWorkoutSet,
    addProteinLog,
    deleteProteinLog,
  } = usePushrData();

  const [activeTab, setActiveTab] = useState<NavTab>('workout');
  const [activePushUpType, setActivePushUpType] = useState<PushUpType>('shoulder');
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pushr_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('pushr_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const todayKey = getLocalDateKey();
  const todayStats = useMemo(() => {
    const sets = workoutSets.filter((s) => s.dateKey === todayKey);
    return {
      setsCount: sets.length,
      totalReps: sets.reduce((sum, s) => sum + s.reps, 0),
      totalCalories: sets.reduce((sum, s) => sum + s.caloriesBurned, 0),
    };
  }, [workoutSets, todayKey]);

  const handleLaunchFromReminder = useCallback((type: PushUpType) => {
    setActivePushUpType(type);
    setActiveTab('workout');
  }, []);

  const {
    permission: notificationPermission,
    activeAlert,
    requestPermission,
    sendTestNotification,
    dismissAlert,
  } = useDailyReminder({
    enabled: profile.reminderEnabled,
    time: profile.reminderTime,
    pushUpType: profile.reminderPushUpType,
    dailyRepGoal: profile.dailyRepGoal,
    todayReps: todayStats.totalReps,
    onLaunchWorkout: handleLaunchFromReminder,
  });

  const handleSaveCompletedSet = async (payload: {
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
  }) => {
    const savedSet = await addWorkoutSet({
      pushUpType: payload.pushUpType,
      reps: payload.reps,
      durationMs: payload.durationMs,
      notes: payload.notes,
    });

    for (const food of payload.selectedProteinFoods) {
      await addProteinLog({
        foodName: food.foodName,
        serving: food.serving,
        proteinGrams: food.proteinGrams,
        calories: food.calories,
        relatedSetId: savedSet.id,
      });
    }

    const totalProteinAdded = payload.selectedProteinFoods.reduce((sum, f) => sum + f.proteinGrams, 0);
    showToast(
      totalProteinAdded > 0
        ? `Saved ${savedSet.reps} reps (${savedSet.caloriesBurned.toFixed(1)} kcal) + ${totalProteinAdded}g protein`
        : `Saved ${savedSet.reps} reps · ${savedSet.caloriesBurned.toFixed(1)} kcal burned`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EAEAEF] dark:bg-[#0B0B0D] text-[#0A0A0C] dark:text-[#F5F5F7] transition-colors duration-300">
      {/* Top Bar: Strict 3-Zone Contract (Brand Wordmark — 4 Concise Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 h-14 sm:h-16 bg-[#EAEAEF]/85 dark:bg-[#0B0B0D]/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.07]">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('workout')}
            className="font-sf-display text-xl font-bold tracking-[-0.03em] text-[#0A0A0C] dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Pushr
          </button>

          {/* Zone 2: 4 Concise Single-Line Nav Links (Desktop) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                    active
                      ? 'text-[#0A0A0C] dark:text-white border-[#0A0A0C] dark:border-white font-semibold'
                      : 'text-[#6E6E73] dark:text-[#9898A0] border-transparent hover:text-[#0A0A0C] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action (Google Cloud Sync Sign-In / Account) */}
          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => void signOut()}
                title={`Signed in as ${user.email || 'Google user'} — click to sign out`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 dark:bg-[#1C1C22] border border-black/[0.08] dark:border-white/[0.1] text-xs font-semibold text-[#0A0A0C] dark:text-white hover:bg-white dark:hover:bg-[#25252C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="max-w-[110px] truncate">{user.displayName || 'Synced'}</span>
                <LogOut className="w-3.5 h-3.5 text-[#6E6E73] dark:text-[#A1A1AA]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signIn()}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{syncing ? 'Signing in...' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-24 md:pb-12">
        {activeAlert && (
          <div
            role="alert"
            className="mb-5 rounded-3xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <BellRing className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <p className="font-sf-display text-sm font-bold leading-snug">{activeAlert.title}</p>
                <p className="text-xs opacity-80 leading-relaxed">{activeAlert.body}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  handleLaunchFromReminder(activeAlert.pushUpType);
                  dismissAlert();
                }}
                className="px-4 py-2 rounded-full bg-white dark:bg-[#0A0A0C] text-[#0A0A0C] dark:text-white text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
              >
                Start Workout
              </button>
              <button
                type="button"
                onClick={dismissAlert}
                aria-label="Dismiss workout reminder"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/15 dark:bg-black/10 hover:bg-white/25 dark:hover:bg-black/15 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {authError && (
          <div className="mb-4 rounded-2xl bg-[#E53935]/10 border border-[#E53935]/20 px-4 py-3 text-xs text-[#C62828] dark:text-[#FCA5A5]">
            {authError}
          </div>
        )}

        {activeTab === 'workout' && (
          <TimerStudio
            activePushUpType={activePushUpType}
            onChangePushUpType={setActivePushUpType}
            todaySetsCount={todayStats.setsCount}
            todayTotalReps={todayStats.totalReps}
            todayTotalCalories={todayStats.totalCalories}
            bodyWeightKg={profile.bodyWeightKg}
            isDark={isDark}
            onToggleDark={() => setIsDark((d) => !d)}
            reminderEnabled={profile.reminderEnabled}
            reminderTime={profile.reminderTime}
            onOpenReminder={() => setReminderModalOpen(true)}
            onSaveCompletedSet={handleSaveCompletedSet}
          />
        )}

        {activeTab === 'animations' && (
          <AnimationsView
            selectedType={activePushUpType}
            bodyWeightKg={profile.bodyWeightKg}
            onSelectType={setActivePushUpType}
            onStartTraining={(type) => {
              setActivePushUpType(type);
              setActiveTab('workout');
            }}
          />
        )}

        {activeTab === 'log' && (
          <DailyLogView
            workoutSets={workoutSets}
            proteinLogs={proteinLogs}
            profile={profile}
            onAddWorkoutSet={addWorkoutSet}
            onDeleteWorkoutSet={deleteWorkoutSet}
            onAddProteinLog={addProteinLog}
            onDeleteProteinLog={deleteProteinLog}
            onUpdateTargets={updateProfileTargets}
            onOpenReminder={() => setReminderModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            workoutSets={workoutSets}
            proteinLogs={proteinLogs}
            profile={profile}
            isDark={isDark}
          />
        )}
      </main>

      {/* Daily Workout Reminder Modal */}
      <DailyReminderModal
        isOpen={reminderModalOpen}
        enabled={profile.reminderEnabled}
        time={profile.reminderTime}
        pushUpType={profile.reminderPushUpType}
        permission={notificationPermission}
        onRequestPermission={requestPermission}
        onSendTest={sendTestNotification}
        onSave={async (settings) => {
          await updateReminderSettings(settings);
          showToast(
            settings.reminderEnabled
              ? `Daily reminder set for ${formatReminderTime12h(settings.reminderTime)}`
              : 'Daily reminder paused'
          );
        }}
        onClose={() => setReminderModalOpen(false)}
      />

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-full bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-xs font-semibold shadow-xl whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}

      {/* Mobile Fixed Bottom Tab Bar (Thumb Zone Ergonomics, <= 15% mobile height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/90 dark:bg-[#111114]/90 backdrop-blur-xl border-t border-black/[0.08] dark:border-white/[0.09]"
      >
        <div className="grid grid-cols-4 h-full max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors cursor-pointer ${
                  active
                    ? 'text-[#0A0A0C] dark:text-white'
                    : 'text-[#8E8E93] dark:text-[#71717A]'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PushrAppContent />
    </ErrorBoundary>
  );
}
