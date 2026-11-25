import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, signInWithGoogle, signOutUser } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  calculatePushUpCalories,
  generateSafeDocId,
  getLocalDateKey,
  getPastDateKeys,
  ProteinLog,
  PushUpType,
  UserProfile,
  WorkoutSet,
} from '../types';

const LOCAL_STORAGE_KEY = 'pushr_guest_data_v1';

interface LocalStore {
  profile: Omit<UserProfile, 'userId'>;
  workoutSets: WorkoutSet[];
  proteinLogs: ProteinLog[];
}

function createInitialGuestData(): LocalStore {
  const days = getPastDateKeys(7);
  const sampleSets: WorkoutSet[] = [
    {
      id: 'sample_set_1',
      userId: 'guest',
      dateKey: days[0],
      setNumber: 1,
      pushUpType: 'shoulder',
      reps: 18,
      durationMs: 24500,
      caloriesBurned: calculatePushUpCalories(18, 'shoulder', 24500, 72),
      notes: 'Pike push-ups warm-up',
      createdAtMs: Date.now() - 6 * 86400000,
    },
    {
      id: 'sample_set_2',
      userId: 'guest',
      dateKey: days[1],
      setNumber: 1,
      pushUpType: 'tricep',
      reps: 22,
      durationMs: 28200,
      caloriesBurned: calculatePushUpCalories(22, 'tricep', 28200, 72),
      notes: 'Diamond close-grip focus',
      createdAtMs: Date.now() - 5 * 86400000,
    },
    {
      id: 'sample_set_3',
      userId: 'guest',
      dateKey: days[2],
      setNumber: 1,
      pushUpType: 'wings',
      reps: 26,
      durationMs: 31400,
      caloriesBurned: calculatePushUpCalories(26, 'wings', 31400, 72),
      notes: 'Wide-grip lat stretch',
      createdAtMs: Date.now() - 4 * 86400000,
    },
    {
      id: 'sample_set_4',
      userId: 'guest',
      dateKey: days[3],
      setNumber: 1,
      pushUpType: 'bicep',
      reps: 24,
      durationMs: 29000,
      caloriesBurned: calculatePushUpCalories(24, 'bicep', 29000, 72),
      notes: 'Reverse-grip slow tempo',
      createdAtMs: Date.now() - 3 * 86400000,
    },
    {
      id: 'sample_set_5',
      userId: 'guest',
      dateKey: days[4],
      setNumber: 1,
      pushUpType: 'shoulder',
      reps: 30,
      durationMs: 36000,
      caloriesBurned: calculatePushUpCalories(30, 'shoulder', 36000, 72),
      notes: 'Strong shoulder lockout',
      createdAtMs: Date.now() - 2 * 86400000,
    },
    {
      id: 'sample_set_6',
      userId: 'guest',
      dateKey: days[5],
      setNumber: 1,
      pushUpType: 'wings',
      reps: 35,
      durationMs: 41200,
      caloriesBurned: calculatePushUpCalories(35, 'wings', 41200, 72),
      notes: 'Deep chest touch',
      createdAtMs: Date.now() - 1 * 86400000,
    },
  ];

  const sampleProtein: ProteinLog[] = [
    {
      id: 'sample_pro_1',
      userId: 'guest',
      dateKey: days[3],
      foodName: 'Whey Protein Shake',
      serving: '1 scoop (30g)',
      proteinGrams: 25,
      calories: 120,
      relatedSetId: 'sample_set_4',
      createdAtMs: Date.now() - 3 * 86400000 + 600000,
    },
    {
      id: 'sample_pro_2',
      userId: 'guest',
      dateKey: days[4],
      foodName: 'Grilled Chicken Breast',
      serving: '150 g cooked',
      proteinGrams: 46,
      calories: 248,
      relatedSetId: 'sample_set_5',
      createdAtMs: Date.now() - 2 * 86400000 + 900000,
    },
    {
      id: 'sample_pro_3',
      userId: 'guest',
      dateKey: days[5],
      foodName: 'Boiled Eggs',
      serving: '2 large eggs',
      proteinGrams: 12,
      calories: 155,
      relatedSetId: 'sample_set_6',
      createdAtMs: Date.now() - 1 * 86400000 + 800000,
    },
    {
      id: 'sample_pro_4',
      userId: 'guest',
      dateKey: days[5],
      foodName: 'Greek Yogurt Bowl',
      serving: '200 g plain',
      proteinGrams: 20,
      calories: 130,
      relatedSetId: 'sample_set_6',
      createdAtMs: Date.now() - 1 * 86400000 + 1800000,
    },
  ];

  return {
    profile: {
      dailyRepGoal: 100,
      dailyProteinGoal: 120,
      bodyWeightKg: 72,
      reminderEnabled: false,
      reminderTime: '18:00',
      reminderPushUpType: 'shoulder',
    },
    workoutSets: sampleSets,
    proteinLogs: sampleProtein,
  };
}

function loadLocalStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalStore;
      if (parsed && parsed.profile && Array.isArray(parsed.workoutSets) && Array.isArray(parsed.proteinLogs)) {
        return {
          ...parsed,
          profile: {
            dailyRepGoal: Number(parsed.profile.dailyRepGoal) || 100,
            dailyProteinGoal: Number(parsed.profile.dailyProteinGoal) || 120,
            bodyWeightKg: Number(parsed.profile.bodyWeightKg) || 72,
            reminderEnabled: Boolean(parsed.profile.reminderEnabled),
            reminderTime: BLUEPRINT_LIMITS.reminderTimePattern.test(String(parsed.profile.reminderTime || ''))
              ? String(parsed.profile.reminderTime)
              : '18:00',
            reminderPushUpType: (['shoulder', 'bicep', 'tricep', 'wings'].includes(
              String(parsed.profile.reminderPushUpType)
            )
              ? parsed.profile.reminderPushUpType
              : 'shoulder') as PushUpType,
          },
        };
      }
    }
  } catch {
    // fallback to initial seed
  }
  const initial = createInitialGuestData();
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore storage quota errors
  }
  return initial;
}

function saveLocalStore(store: LocalStore) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

function toTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  return Date.now();
}

export function usePushrData() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const [localStore, setLocalStore] = useState<LocalStore>(() => loadLocalStore());
  const [cloudProfile, setCloudProfile] = useState<UserProfile | null>(null);
  const [cloudSets, setCloudSets] = useState<WorkoutSet[]>([]);
  const [cloudProtein, setCloudProtein] = useState<ProteinLog[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setProfileReady(false);
        setCloudProfile(null);
        setCloudSets([]);
        setCloudProtein([]);
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap parent /users/{userId} document on sign-in (Master Gate requirement)
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;

    async function ensureUserProfile(uid: string) {
      const profilePath = `users/${uid}`;
      const profileRef = doc(db, 'users', uid);
      try {
        const snap = await getDoc(profileRef);
        if (!snap.exists()) {
          await setDoc(profileRef, {
            userId: uid,
            dailyRepGoal: localStore.profile.dailyRepGoal,
            dailyProteinGoal: localStore.profile.dailyProteinGoal,
            bodyWeightKg: localStore.profile.bodyWeightKg,
            reminderEnabled: localStore.profile.reminderEnabled,
            reminderTime: localStore.profile.reminderTime,
            reminderPushUpType: localStore.profile.reminderPushUpType,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        if (!cancelled) {
          setProfileReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          handleFirestoreError(error, OperationType.WRITE, profilePath);
        }
      }
    }

    void ensureUserProfile(user.uid);
    return () => {
      cancelled = true;
    };
  }, [authReady, user]);

  // Attach real-time Firestore listeners once authenticated and profile exists
  useEffect(() => {
    if (!authReady || !user || !profileReady) return;
    const uid = user.uid;

    const profilePath = `users/${uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCloudProfile({
            userId: uid,
            dailyRepGoal: Number(data.dailyRepGoal) || 100,
            dailyProteinGoal: Number(data.dailyProteinGoal) || 120,
            bodyWeightKg: Number(data.bodyWeightKg) || 72,
            reminderEnabled: Boolean(data.reminderEnabled),
            reminderTime: BLUEPRINT_LIMITS.reminderTimePattern.test(String(data.reminderTime || ''))
              ? String(data.reminderTime)
              : '18:00',
            reminderPushUpType: (['shoulder', 'bicep', 'tricep', 'wings'].includes(
              String(data.reminderPushUpType)
            )
              ? data.reminderPushUpType
              : 'shoulder') as PushUpType,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, profilePath);
      }
    );

    const setsPath = `users/${uid}/workoutSets`;
    const setsQuery = query(collection(db, 'users', uid, 'workoutSets'), where('userId', '==', uid));
    const unsubSets = onSnapshot(
      setsQuery,
      (snapshot) => {
        const rows: WorkoutSet[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.userId),
            dateKey: String(data.dateKey),
            setNumber: Number(data.setNumber) || 1,
            pushUpType: data.pushUpType as PushUpType,
            reps: Number(data.reps) || 0,
            durationMs: Number(data.durationMs) || 0,
            caloriesBurned: Number(data.caloriesBurned) || 0,
            notes: String(data.notes || ''),
            createdAtMs: toTimestampMs(data.createdAt),
          };
        });
        rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setCloudSets(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, setsPath);
      }
    );

    const proteinPath = `users/${uid}/proteinLogs`;
    const proteinQuery = query(collection(db, 'users', uid, 'proteinLogs'), where('userId', '==', uid));
    const unsubProtein = onSnapshot(
      proteinQuery,
      (snapshot) => {
        const rows: ProteinLog[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: String(data.userId),
            dateKey: String(data.dateKey),
            foodName: String(data.foodName),
            serving: String(data.serving),
            proteinGrams: Number(data.proteinGrams) || 0,
            calories: Number(data.calories) || 0,
            relatedSetId: String(data.relatedSetId || ''),
            createdAtMs: toTimestampMs(data.createdAt),
          };
        });
        rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setCloudProtein(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, proteinPath);
      }
    );

    return () => {
      unsubProfile();
      unsubSets();
      unsubProtein();
    };
  }, [authReady, user, profileReady]);

  const activeProfile: UserProfile = user && cloudProfile
    ? cloudProfile
    : {
        userId: user?.uid || 'guest',
        ...localStore.profile,
      };

  const workoutSets = user ? cloudSets : localStore.workoutSets;
  const proteinLogs = user ? cloudProtein : localStore.proteinLogs;

  const handleSignIn = useCallback(async () => {
    setAuthError(null);
    setSyncing(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in right now.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    await signOutUser();
  }, []);

  const updateProfileTargets = useCallback(
    async (updates: { dailyRepGoal: number; dailyProteinGoal: number; bodyWeightKg: number }) => {
      const dailyRepGoal = Math.max(
        BLUEPRINT_LIMITS.minDailyRepGoal,
        Math.min(BLUEPRINT_LIMITS.maxDailyRepGoal, Math.round(updates.dailyRepGoal))
      );
      const dailyProteinGoal = Math.max(
        BLUEPRINT_LIMITS.minDailyProteinGoal,
        Math.min(BLUEPRINT_LIMITS.maxDailyProteinGoal, Math.round(updates.dailyProteinGoal))
      );
      const bodyWeightKg = Math.max(
        BLUEPRINT_LIMITS.minBodyWeightKg,
        Math.min(BLUEPRINT_LIMITS.maxBodyWeightKg, Math.round(updates.bodyWeightKg))
      );

      if (user) {
        const path = `users/${user.uid}`;
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            dailyRepGoal,
            dailyProteinGoal,
            bodyWeightKg,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      } else {
        setLocalStore((prev) => {
          const next: LocalStore = {
            ...prev,
            profile: {
              ...prev.profile,
              dailyRepGoal,
              dailyProteinGoal,
              bodyWeightKg,
            },
          };
          saveLocalStore(next);
          return next;
        });
      }
    },
    [user]
  );

  const updateReminderSettings = useCallback(
    async (updates: {
      reminderEnabled: boolean;
      reminderTime: string;
      reminderPushUpType: PushUpType;
    }) => {
      const reminderEnabled = Boolean(updates.reminderEnabled);
      const reminderTime = BLUEPRINT_LIMITS.reminderTimePattern.test(updates.reminderTime)
        ? updates.reminderTime
        : '18:00';
      const reminderPushUpType: PushUpType = (['shoulder', 'bicep', 'tricep', 'wings'] as PushUpType[]).includes(
        updates.reminderPushUpType
      )
        ? updates.reminderPushUpType
        : 'shoulder';

      if (user) {
        const path = `users/${user.uid}`;
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            reminderEnabled,
            reminderTime,
            reminderPushUpType,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      } else {
        setLocalStore((prev) => {
          const next: LocalStore = {
            ...prev,
            profile: {
              ...prev.profile,
              reminderEnabled,
              reminderTime,
              reminderPushUpType,
            },
          };
          saveLocalStore(next);
          return next;
        });
      }
    },
    [user]
  );

  const addWorkoutSet = useCallback(
    async (input: {
      pushUpType: PushUpType;
      reps: number;
      durationMs: number;
      notes?: string;
      dateKey?: string;
    }): Promise<WorkoutSet> => {
      const dateKey =
        input.dateKey && BLUEPRINT_LIMITS.dateKeyPattern.test(input.dateKey)
          ? input.dateKey
          : getLocalDateKey();
      const reps = Math.max(1, Math.min(BLUEPRINT_LIMITS.maxReps, Math.round(input.reps)));
      const durationMs = Math.max(0, Math.min(BLUEPRINT_LIMITS.maxDurationMs, Math.round(input.durationMs)));
      const caloriesBurned = Math.min(
        BLUEPRINT_LIMITS.maxCaloriesBurned,
        calculatePushUpCalories(reps, input.pushUpType, durationMs, activeProfile.bodyWeightKg)
      );
      const notes = (input.notes || '').trim().slice(0, BLUEPRINT_LIMITS.notesMaxLength);
      const existingTodayCount = workoutSets.filter((s) => s.dateKey === dateKey).length;
      const setNumber = Math.min(100, existingTodayCount + 1);
      const setId = generateSafeDocId('set');

      if (user) {
        const path = `users/${user.uid}/workoutSets/${setId}`;
        try {
          await setDoc(doc(db, 'users', user.uid, 'workoutSets', setId), {
            userId: user.uid,
            dateKey,
            setNumber,
            pushUpType: input.pushUpType,
            reps,
            durationMs,
            caloriesBurned,
            notes,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
        return {
          id: setId,
          userId: user.uid,
          dateKey,
          setNumber,
          pushUpType: input.pushUpType,
          reps,
          durationMs,
          caloriesBurned,
          notes,
          createdAtMs: Date.now(),
        };
      }

      const newSet: WorkoutSet = {
        id: setId,
        userId: 'guest',
        dateKey,
        setNumber,
        pushUpType: input.pushUpType,
        reps,
        durationMs,
        caloriesBurned,
        notes,
        createdAtMs: Date.now(),
      };
      setLocalStore((prev) => {
        const next: LocalStore = {
          ...prev,
          workoutSets: [newSet, ...prev.workoutSets],
        };
        saveLocalStore(next);
        return next;
      });
      return newSet;
    },
    [user, workoutSets, activeProfile.bodyWeightKg]
  );

  const deleteWorkoutSet = useCallback(
    async (setId: string) => {
      if (user) {
        const path = `users/${user.uid}/workoutSets/${setId}`;
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'workoutSets', setId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      } else {
        setLocalStore((prev) => {
          const next: LocalStore = {
            ...prev,
            workoutSets: prev.workoutSets.filter((s) => s.id !== setId),
          };
          saveLocalStore(next);
          return next;
        });
      }
    },
    [user]
  );

  const addProteinLog = useCallback(
    async (input: {
      foodName: string;
      serving: string;
      proteinGrams: number;
      calories: number;
      relatedSetId?: string;
      dateKey?: string;
    }): Promise<ProteinLog> => {
      const dateKey =
        input.dateKey && BLUEPRINT_LIMITS.dateKeyPattern.test(input.dateKey)
          ? input.dateKey
          : getLocalDateKey();
      const foodName = input.foodName.trim().slice(0, BLUEPRINT_LIMITS.foodNameMaxLength) || 'Protein Meal';
      const serving = input.serving.trim().slice(0, BLUEPRINT_LIMITS.servingMaxLength) || '1 serving';
      const proteinGrams = Math.max(
        0,
        Math.min(BLUEPRINT_LIMITS.maxProteinGrams, Math.round(input.proteinGrams * 10) / 10)
      );
      const calories = Math.max(0, Math.min(BLUEPRINT_LIMITS.maxFoodCalories, Math.round(input.calories)));
      const rawRelated = (input.relatedSetId || '').trim().slice(0, BLUEPRINT_LIMITS.idMaxLength);
      const relatedSetId = BLUEPRINT_LIMITS.idPattern.test(rawRelated) ? rawRelated : '';
      const logId = generateSafeDocId('pro');

      if (user) {
        const path = `users/${user.uid}/proteinLogs/${logId}`;
        try {
          await setDoc(doc(db, 'users', user.uid, 'proteinLogs', logId), {
            userId: user.uid,
            dateKey,
            foodName,
            serving,
            proteinGrams,
            calories,
            relatedSetId,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, path);
        }
        return {
          id: logId,
          userId: user.uid,
          dateKey,
          foodName,
          serving,
          proteinGrams,
          calories,
          relatedSetId,
          createdAtMs: Date.now(),
        };
      }

      const newLog: ProteinLog = {
        id: logId,
        userId: 'guest',
        dateKey,
        foodName,
        serving,
        proteinGrams,
        calories,
        relatedSetId,
        createdAtMs: Date.now(),
      };
      setLocalStore((prev) => {
        const next: LocalStore = {
          ...prev,
          proteinLogs: [newLog, ...prev.proteinLogs],
        };
        saveLocalStore(next);
        return next;
      });
      return newLog;
    },
    [user]
  );

  const deleteProteinLog = useCallback(
    async (logId: string) => {
      if (user) {
        const path = `users/${user.uid}/proteinLogs/${logId}`;
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'proteinLogs', logId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      } else {
        setLocalStore((prev) => {
          const next: LocalStore = {
            ...prev,
            proteinLogs: prev.proteinLogs.filter((p) => p.id !== logId),
          };
          saveLocalStore(next);
          return next;
        });
      }
    },
    [user]
  );

  return {
    user,
    authReady,
    authError,
    syncing,
    profile: activeProfile,
    workoutSets,
    proteinLogs,
    signIn: handleSignIn,
    signOut: handleSignOut,
    updateProfileTargets,
    updateReminderSettings,
    addWorkoutSet,
    deleteWorkoutSet,
    addProteinLog,
    deleteProteinLog,
  };
}
