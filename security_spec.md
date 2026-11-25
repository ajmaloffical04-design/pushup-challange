# Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants
1. A `UserProfile` at `/users/{userId}` can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId`. Listing `/users` is strictly forbidden.
2. A `WorkoutSet` at `/users/{userId}/workoutSets/{setId}` cannot exist without an existing parent `/users/{userId}` document belonging to `request.auth.uid`.
3. A `ProteinLog` at `/users/{userId}/proteinLogs/{logId}` cannot exist without an existing parent `/users/{userId}` document belonging to `request.auth.uid`.
4. All `createdAt` timestamps must equal `request.time` on create and remain strictly immutable on update.
5. All `pushUpType` values must belong to the closed enum `['shoulder', 'bicep', 'tricep', 'wings']`.
6. All string fields must enforce explicit `.size()` bounds and ID/date regex patterns; all numeric fields must enforce domain min/max limits.
7. Shadow/extra fields (e.g., `role`, `isAdmin`, `isVerified`) must be rejected via strict `hasOnly()` checks on both create and update.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Profile**: Create `/users/userA` with `{ userId: "userB", ... }`. Expected: `PERMISSION_DENIED`.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` creating `/users/userA`. Expected: `PERMISSION_DENIED`.
3. **Shadow Field Injection (Privilege Escalation)**: Create `/users/userA` with `{ ..., isAdmin: true }`. Expected: `PERMISSION_DENIED`.
4. **Cross-User Read (PII/Data Isolation)**: `userB` attempting `get` on `/users/userA` or `/users/userA/workoutSets/set1`. Expected: `PERMISSION_DENIED`.
5. **User Collection Enumeration**: Any signed-in user attempting `list` on `/users`. Expected: `PERMISSION_DENIED`.
6. **Orphaned Workout Set**: Creating `/users/userA/workoutSets/set1` when `/users/userA` does not exist. Expected: `PERMISSION_DENIED`.
7. **Invalid Push-Up Enum**: Creating a `WorkoutSet` with `pushUpType: "chest_hack"`. Expected: `PERMISSION_DENIED`.
8. **Timestamp Forgery**: Creating a `WorkoutSet` with client-backdated `createdAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
9. **ID Poisoning**: Creating a document with a 200-character or special-character document ID (`setId = "a".repeat(200)`). Expected: `PERMISSION_DENIED`.
10. **Value Poisoning on Update**: Updating `WorkoutSet.notes` with a 1000-character string or changing `reps` during a notes-only update. Expected: `PERMISSION_DENIED`.
11. **Immutable Field Tampering**: Updating `UserProfile` and attempting to alter `userId` or `createdAt`. Expected: `PERMISSION_DENIED`.
12. **Resource Exhaustion / Out-of-Bounds Metrics**: Creating `ProteinLog` with `proteinGrams: 99999` or `foodName` longer than 80 characters. Expected: `PERMISSION_DENIED`.
