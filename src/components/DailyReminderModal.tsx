import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Check, Clock, X } from 'lucide-react';
import { BrowserNotificationState } from '../hooks/useDailyReminder';
import {
  formatReminderTime12h,
  getTimeUntilReminder,
  PUSH_UP_ORDER,
  PUSH_UP_VARIATIONS,
  PushUpType,
} from '../types';

interface DailyReminderModalProps {
  isOpen: boolean;
  enabled: boolean;
  time: string;
  pushUpType: PushUpType;
  permission: BrowserNotificationState;
  onRequestPermission: () => Promise<BrowserNotificationState>;
  onSendTest: () => void;
  onSave: (settings: {
    reminderEnabled: boolean;
    reminderTime: string;
    reminderPushUpType: PushUpType;
  }) => Promise<void>;
  onClose: () => void;
}

const TIME_PRESETS = [
  { label: 'Morning', time: '07:00' },
  { label: 'Midday', time: '12:30' },
  { label: 'Evening', time: '18:00' },
  { label: 'Night', time: '21:00' },
] as const;

export const DailyReminderModal: React.FC<DailyReminderModalProps> = ({
  isOpen,
  enabled,
  time,
  pushUpType,
  permission,
  onRequestPermission,
  onSendTest,
  onSave,
  onClose,
}) => {
  const [draftEnabled, setDraftEnabled] = useState(enabled);
  const [draftTime, setDraftTime] = useState(time);
  const [draftType, setDraftType] = useState<PushUpType>(pushUpType);
  const [saving, setSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraftEnabled(enabled);
      setDraftTime(time);
      setDraftType(pushUpType);
      setTestSent(false);
    }
  }, [isOpen, enabled, time, pushUpType]);

  if (!isOpen) return null;

  const handleToggleEnabled = async () => {
    const next = !draftEnabled;
    setDraftEnabled(next);
    if (next && permission === 'default') {
      await onRequestPermission();
    }
  };

  const handleTest = async () => {
    if (permission === 'default') {
      await onRequestPermission();
    }
    onSendTest();
    setTestSent(true);
    window.setTimeout(() => setTestSent(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (draftEnabled && permission === 'default') {
        await onRequestPermission();
      }
      await onSave({
        reminderEnabled: draftEnabled,
        reminderTime: draftTime,
        reminderPushUpType: draftType,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const nextLabel = getTimeUntilReminder(draftTime);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-reminder-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#F5F5F7] dark:bg-[#111114] border border-black/10 dark:border-white/10 shadow-2xl">
        <div className="sm:hidden w-10 h-1.5 bg-black/15 dark:bg-white/20 rounded-full mx-auto mt-3" />

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#6E6E73] dark:text-[#9898A0]">
                Training Consistency
              </p>
              <h2
                id="daily-reminder-title"
                className="font-sf-display text-2xl font-bold tracking-tight text-[#0A0A0C] dark:text-white mt-0.5"
              >
                Daily Workout Reminder
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reminder settings"
              className="w-10 h-10 rounded-full flex items-center justify-center bg-black/[0.06] dark:bg-white/[0.08] text-[#0A0A0C] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Enable / Disable Switch Card */}
          <div className="rounded-3xl bg-white dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  draftEnabled
                    ? 'bg-[#0A0A0C] text-white dark:bg-white dark:text-[#0A0A0C]'
                    : 'bg-black/[0.05] dark:bg-white/[0.07] text-[#6E6E73] dark:text-[#9898A0]'
                }`}
              >
                {draftEnabled ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0A0A0C] dark:text-white">
                  {draftEnabled ? 'Daily reminder active' : 'Daily reminder paused'}
                </p>
                <p className="text-xs text-[#6E6E73] dark:text-[#9898A0] truncate">
                  {draftEnabled
                    ? `${formatReminderTime12h(draftTime)} · Next ${nextLabel}`
                    : 'Turn on to get notified at your workout time'}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={draftEnabled}
              aria-label="Toggle daily workout reminder"
              onClick={() => void handleToggleEnabled()}
              className={`relative w-13 h-8 rounded-full transition-colors shrink-0 cursor-pointer ${
                draftEnabled ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-black/15 dark:bg-white/15'
              }`}
            >
              <span
                className={`block w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  draftEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Time Picker + Quick Presets */}
          <div className="rounded-3xl bg-white dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="reminder-time-input"
                className="text-xs font-semibold text-[#6E6E73] dark:text-[#9898A0] flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Workout Time
              </label>
              <span className="font-sf-mono text-xs text-[#6E6E73] dark:text-[#9898A0] tabular-nums">
                {formatReminderTime12h(draftTime)}
              </span>
            </div>

            <input
              id="reminder-time-input"
              type="time"
              required
              value={draftTime}
              onChange={(e) => {
                setDraftTime(e.target.value);
                if (!draftEnabled) setDraftEnabled(true);
              }}
              className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F5F7] dark:bg-[#222228] border border-black/[0.06] dark:border-white/[0.08] font-sf-display text-3xl font-bold tabular-nums text-center text-[#0A0A0C] dark:text-white focus:outline-none focus:ring-2 focus:ring-black/25 dark:focus:ring-white/25"
            />

            <div className="grid grid-cols-4 gap-2">
              {TIME_PRESETS.map((preset) => {
                const active = draftTime === preset.time;
                return (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => {
                      setDraftTime(preset.time);
                      if (!draftEnabled) setDraftEnabled(true);
                    }}
                    className={`py-2 px-2 rounded-xl text-center transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#0A0A0C] text-white dark:bg-white dark:text-[#0A0A0C]'
                        : 'bg-[#F5F5F7] dark:bg-[#222228] text-[#3A3A40] dark:text-[#D4D4D8] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold">{preset.label}</span>
                    <span className="block font-sf-mono text-[10px] opacity-75 tabular-nums">
                      {preset.time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Muscle Focus for Reminder Launch */}
          <div className="rounded-3xl bg-white dark:bg-[#17171B] border border-black/[0.06] dark:border-white/[0.08] p-5">
            <p className="text-xs font-semibold text-[#6E6E73] dark:text-[#9898A0] mb-2.5">
              Focus Variation When Notification Opens
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PUSH_UP_ORDER.map((typeKey) => {
                const active = draftType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setDraftType(typeKey)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#0A0A0C] text-white dark:bg-white dark:text-[#0A0A0C]'
                        : 'bg-[#F5F5F7] dark:bg-[#222228] text-[#3A3A40] dark:text-[#D4D4D8] hover:bg-black/[0.08] dark:hover:bg-white/[0.12]'
                    }`}
                  >
                    {PUSH_UP_VARIATIONS[typeKey].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Browser Notification Permission Status & Test Trigger */}
          <div className="rounded-2xl bg-white/75 dark:bg-[#17171B]/80 border border-black/[0.06] dark:border-white/[0.08] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs leading-relaxed">
              {permission === 'granted' && (
                <p className="text-[#0A0A0C] dark:text-white font-medium">
                  Browser notifications allowed · Alerts fire automatically at {formatReminderTime12h(draftTime)} while Pushr is open.
                </p>
              )}
              {permission === 'default' && (
                <p className="text-[#6E6E73] dark:text-[#A1A1AA]">
                  Browser notification permission has not been granted yet.
                </p>
              )}
              {permission === 'denied' && (
                <p className="text-[#C62828] dark:text-[#FCA5A5]">
                  Browser notifications are blocked in browser settings. In-app audio & banner alerts will still fire on schedule.
                </p>
              )}
              {permission === 'unsupported' && (
                <p className="text-[#6E6E73] dark:text-[#A1A1AA]">
                  Native browser notifications are unavailable here. In-app audio & banner alerts will fire on schedule.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {permission === 'default' && (
                <button
                  type="button"
                  onClick={() => void onRequestPermission()}
                  className="px-3.5 py-2 rounded-xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
                >
                  Allow Alerts
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleTest()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/[0.06] dark:bg-white/[0.08] text-xs font-semibold text-[#0A0A0C] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors whitespace-nowrap cursor-pointer"
              >
                {testSent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Bell className="w-3.5 h-3.5" />}
                {testSent ? 'Sent' : 'Test Alert'}
              </button>
            </div>
          </div>

          {/* Save / Cancel Footer */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-3 rounded-2xl bg-black/[0.06] dark:bg-white/[0.08] text-sm font-semibold text-[#0A0A0C] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-5 rounded-2xl bg-[#0A0A0C] dark:bg-white text-white dark:text-[#0A0A0C] text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
