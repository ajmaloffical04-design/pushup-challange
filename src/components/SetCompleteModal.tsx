import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  formatStopwatch,
  PROTEIN_FOOD_PRESETS,
  ProteinFoodPreset,
  PUSH_UP_VARIATIONS,
  PushUpType,
} from '../types';
import { CalorieBurnEquivalents } from './CalorieBurnEquivalents';

interface SetCompleteModalProps {
  isOpen: boolean;
  setNumber: number;
  pushUpType: PushUpType;
  reps: number;
  durationMs: number;
  setCalories: number;
  todayTotalCaloriesAfterSet: number;
  targetReps: number; // 0 = free mode
  reason: 'rep_target' | 'timer_end' | 'manual_stop';
  onSaveAndClose: (options: {
    notes: string;
    selectedProteinFoods: Array<{
      foodName: string;
      serving: string;
      proteinGrams: number;
      calories: number;
    }>;
  }) => Promise<void>;
  onDiscard: () => void;
}

export const SetCompleteModal: React.FC<SetCompleteModalProps> = ({
  isOpen,
  setNumber,
  pushUpType,
  reps,
  durationMs,
  setCalories,
  todayTotalCaloriesAfterSet,
  targetReps,
  reason,
  onSaveAndClose,
  onDiscard,
}) => {
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [customFoodName, setCustomFoodName] = useState('');
  const [customServing, setCustomServing] = useState('1 serving');
  const [customProtein, setCustomProtein] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const meta = PUSH_UP_VARIATIONS[pushUpType];

  const togglePreset = (id: string) => {
    setSelectedPresetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedPresets: ProteinFoodPreset[] = PROTEIN_FOOD_PRESETS.filter((p) =>
    selectedPresetIds.includes(p.id)
  );

  const totalSelectedProtein =
    selectedPresets.reduce((sum, p) => sum + p.proteinGrams, 0) +
    (showCustomForm && customFoodName.trim() ? Number(customProtein) || 0 : 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const foods = selectedPresets.map((p) => ({
        foodName: p.foodName,
        serving: p.serving,
        proteinGrams: p.proteinGrams,
        calories: p.calories,
      }));
      if (showCustomForm && customFoodName.trim()) {
        foods.push({
          foodName: customFoodName.trim().slice(0, BLUEPRINT_LIMITS.foodNameMaxLength),
          serving: (customServing.trim() || '1 serving').slice(0, BLUEPRINT_LIMITS.servingMaxLength),
          proteinGrams: Math.max(0, Math.min(BLUEPRINT_LIMITS.maxProteinGrams, Number(customProtein) || 0)),
          calories: Math.max(0, Math.min(BLUEPRINT_LIMITS.maxFoodCalories, Number(customCalories) || 0)),
        });
      }
      await onSaveAndClose({ notes, selectedProteinFoods: foods });
      setSelectedPresetIds([]);
      setCustomFoodName('');
      setCustomServing('1 serving');
      setCustomProtein('');
      setCustomCalories('');
      setShowCustomForm(false);
      setNotes('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-complete-title"
    >
      <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#F5F5F7] dark:bg-[#111114] border border-black/10 dark:border-white/10 shadow-2xl">
        {/* Grab handle on mobile */}
        <div className="sm:hidden w-10 h-1.5 bg-black/15 dark:bg-white/20 rounded-full mx-auto mt-3" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
                {reason === 'rep_target'
                  ? `Set ${setNumber} Target Reached`
                  : reason === 'timer_end'
                    ? 'Timer Ended'
                    : 'Set Complete'}{' '}
                · Set {setNumber} · {meta.label} ({meta.variationName})
              </p>
              <h2
                id="set-complete-title"
                className="font-sf-display text-2xl font-bold tracking-tight text-[#0A0A0C] dark:text-white mt-0.5"
              >
                {targetReps > 0 && reason === 'rep_target'
                  ? `Set ${setNumber} Complete (${reps}/${targetReps})`
                  : `${reps} Push-Ups Logged`}
              </h2>
            </div>
            <button
              type="button"
              onClick={onDiscard}
              aria-label="Discard set"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-black/[0.06] dark:bg-white/[0.08] text-[#0A0A0C] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Key Set Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white dark:bg-[#19191E] p-3.5 border border-black/[0.05] dark:border-white/[0.07]">
              <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">Reps</p>
              <p className="font-sf-display text-2xl font-bold tabular-nums text-[#0A0A0C] dark:text-white mt-0.5">
                {reps}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#19191E] p-3.5 border border-black/[0.05] dark:border-white/[0.07]">
              <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">Timer</p>
              <p className="font-sf-mono text-lg font-semibold tabular-nums text-[#0A0A0C] dark:text-white mt-1.5">
                {formatStopwatch(durationMs)}
              </p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-[#19191E] p-3.5 border border-black/[0.05] dark:border-white/[0.07]">
              <p className="text-xs text-[#6E6E73] dark:text-[#9898A0]">Set Burn</p>
              <p className="font-sf-display text-2xl font-bold tabular-nums text-[#E53935] mt-0.5">
                {setCalories.toFixed(1)} <span className="text-xs font-medium text-[#6E6E73]">kcal</span>
              </p>
            </div>
          </div>

          {/* Real Calorie Burn Equivalent (Coca-Cola 200 kcal etc.) */}
          <CalorieBurnEquivalents
            totalKcal={todayTotalCaloriesAfterSet}
            setKcal={setCalories}
          />

          {/* Post-Push-Up Protein Food Selector */}
          <div className="rounded-3xl bg-white dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-sf-display text-base font-semibold text-[#0A0A0C] dark:text-white">
                Protein Food Taken After Push-Ups
              </h3>
              {totalSelectedProtein > 0 && (
                <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{totalSelectedProtein}g protein selected
                </span>
              )}
            </div>
            <p className="text-xs text-[#6E6E73] dark:text-[#9898A0] mb-3.5">
              {meta.recommendedProteinTip}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROTEIN_FOOD_PRESETS.slice(0, 6).map((preset) => {
                const isSelected = selectedPresetIds.includes(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => togglePreset(preset.id)}
                    className={`flex items-center justify-between text-left px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer min-h-[48px] ${
                      isSelected
                        ? 'bg-[#0A0A0C] text-white border-[#0A0A0C] dark:bg-white dark:text-[#0A0A0C] dark:border-white'
                        : 'bg-[#F5F5F7]/70 dark:bg-[#1F1F25] border-black/[0.06] dark:border-white/[0.08] text-[#0A0A0C] dark:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate">{preset.foodName}</p>
                      <p
                        className={`text-[11px] truncate ${
                          isSelected
                            ? 'text-white/75 dark:text-black/65'
                            : 'text-[#6E6E73] dark:text-[#9898A0]'
                        }`}
                      >
                        {preset.serving} · {preset.calories} kcal
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-sf-mono text-xs font-semibold tabular-nums">
                        {preset.proteinGrams}g
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Toggle Custom Protein Food */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowCustomForm((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0A0A0C] dark:text-white hover:underline cursor-pointer py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {showCustomForm ? 'Hide custom food' : 'Add custom protein food'}
              </button>

              {showCustomForm && (
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Food name (e.g. Egg white wrap)"
                    value={customFoodName}
                    maxLength={BLUEPRINT_LIMITS.foodNameMaxLength}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-xl bg-[#F5F5F7] dark:bg-[#222228] border border-black/10 dark:border-white/10 text-xs text-[#0A0A0C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A0A0C]/30 dark:focus:ring-white/30"
                  />
                  <input
                    type="number"
                    min={0}
                    max={BLUEPRINT_LIMITS.maxProteinGrams}
                    placeholder="Protein (g)"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#F5F5F7] dark:bg-[#222228] border border-black/10 dark:border-white/10 text-xs text-[#0A0A0C] dark:text-white tabular-nums focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    max={BLUEPRINT_LIMITS.maxFoodCalories}
                    placeholder="Calories (kcal)"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#F5F5F7] dark:bg-[#222228] border border-black/10 dark:border-white/10 text-xs text-[#0A0A0C] dark:text-white tabular-nums focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Optional Set Note */}
          <div>
            <label htmlFor="set-note-input" className="sr-only">
              Set note
            </label>
            <input
              id="set-note-input"
              type="text"
              value={notes}
              maxLength={BLUEPRINT_LIMITS.notesMaxLength}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note (e.g. strict form, slow eccentric)"
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#19191E] border border-black/[0.08] dark:border-white/[0.09] text-sm text-[#0A0A0C] dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onDiscard}
              disabled={saving}
              className="px-5 py-3 rounded-2xl bg-black/[0.06] dark:bg-white/[0.08] text-sm font-semibold text-[#0A0A0C] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 px-5 rounded-2xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : totalSelectedProtein > 0
                  ? `Save Set ${setNumber} & Log ${totalSelectedProtein}g Protein`
                  : `Save & Ready for Set ${setNumber + 1}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
