import { useCallback, useEffect, useState } from 'react';
import {
  formatReminderTime12h,
  getLocalDateKey,
  getTimeUntilReminder,
  PUSH_UP_VARIATIONS,
  PushUpType,
} from '../types';

export type BrowserNotificationState = 'granted' | 'denied' | 'default' | 'unsupported';

const LAST_FIRED_KEY = 'pushr_daily_reminder_last_fired_v1';

function readBrowserPermission(): BrowserNotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function playReminderChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.11;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    });
    window.setTimeout(() => {
      void ctx.close();
    }, 800);
  } catch {
    // ignore WebAudio restrictions
  }
}

interface UseDailyReminderOptions {
  enabled: boolean;
  time: string; // HH:MM
  pushUpType: PushUpType;
  dailyRepGoal: number;
  todayReps: number;
  onLaunchWorkout: (type: PushUpType) => void;
}

export interface ActiveReminderAlert {
  title: string;
  body: string;
  pushUpType: PushUpType;
  isTest?: boolean;
}

export function useDailyReminder({
  enabled,
  time,
  pushUpType,
  dailyRepGoal,
  todayReps,
  onLaunchWorkout,
}: UseDailyReminderOptions) {
  const [permission, setPermission] = useState<BrowserNotificationState>(() => readBrowserPermission());
  const [nextReminderLabel, setNextReminderLabel] = useState<string>(() =>
    getTimeUntilReminder(time)
  );
  const [activeAlert, setActiveAlert] = useState<ActiveReminderAlert | null>(null);

  const requestPermission = useCallback(async (): Promise<BrowserNotificationState> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported';
    }
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      const current = readBrowserPermission();
      setPermission(current);
      return current;
    }
  }, []);

  const triggerNotification = useCallback(
    (isTest = false) => {
      const meta = PUSH_UP_VARIATIONS[pushUpType];
      const remaining = Math.max(0, dailyRepGoal - todayReps);
      const title = isTest ? 'Pushr Reminder Preview' : 'Time for your Pushr workout';
      const body =
        remaining > 0
          ? `${meta.label} (${meta.variationName}) session · ${remaining} reps left to hit today's ${dailyRepGoal}-rep goal.`
          : `${meta.label} (${meta.variationName}) bonus set · Scheduled daily at ${formatReminderTime12h(time)}.`;

      setActiveAlert({ title, body, pushUpType, isTest });
      playReminderChime();

      const currentPerm = readBrowserPermission();
      setPermission(currentPerm);

      if (currentPerm === 'granted') {
        try {
          const notif = new Notification(title, {
            body,
            tag: isTest ? `pushr-test-${Date.now()}` : `pushr-daily-${getLocalDateKey()}`,
            requireInteraction: false,
          });
          notif.onclick = () => {
            window.focus();
            onLaunchWorkout(pushUpType);
            setActiveAlert(null);
            notif.close();
          };
        } catch {
          // Some sandboxed iframes restrict native Notification constructor; in-app banner still fires
        }
      }
    },
    [pushUpType, dailyRepGoal, todayReps, time, onLaunchWorkout]
  );

  // Sync permission & countdown label and check scheduled minute every 10s
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      setPermission(readBrowserPermission());
      setNextReminderLabel(getTimeUntilReminder(time, now));

      if (!enabled) return;

      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentHHMM !== time) return;

      const todayKey = getLocalDateKey(now);
      const fireToken = `${todayKey}_${time}`;
      try {
        if (localStorage.getItem(LAST_FIRED_KEY) === fireToken) {
          return;
        }
        localStorage.setItem(LAST_FIRED_KEY, fireToken);
      } catch {
        // proceed even if localStorage unavailable
      }

      triggerNotification(false);
    };

    checkSchedule();
    const intervalId = window.setInterval(checkSchedule, 10000);
    return () => window.clearInterval(intervalId);
  }, [enabled, time, triggerNotification]);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  return {
    permission,
    nextReminderLabel,
    activeAlert,
    requestPermission,
    sendTestNotification: () => triggerNotification(true),
    dismissAlert,
  };
}
