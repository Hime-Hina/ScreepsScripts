# Rollback

## Scenario: Restore Previous Screeps Remote Code

### 1. Scope / Trigger

This contract applies before any operation replaces code on a live Screeps branch.

Rollback is about restoring the Screeps remote runtime code. It is not `git checkout`, and it must not mutate unrelated local source files.

### 2. Signatures

Future rollback tooling should use an explicit command name:

```text
rollback:screeps
```

The rollback snapshot must contain:

- Branch.
- Module names.
- Original module contents or a recoverable reference.
- Original SHA-256 per module or whole module set.
- Capture timestamp.

### 3. Contracts

Before deployment:

- Capture the current remote module set.
- Store the rollback snapshot outside tracked source.
- Confirm the target branch and module set.

During rollback:

- Restore the previous module set to the same branch.
- Read back the restored modules.
- Compare readback hash with the rollback snapshot.
- Record rollback result in `docs/game-state.md`.

Rollback snapshots must be ignored by Git. If a snapshot directory is introduced, add it to `.gitignore` in the same task.

### 4. Validation & Error Matrix

| Condition | Required Behavior |
| --- | --- |
| No rollback snapshot | Do not deploy unless the user explicitly accepts manual risk |
| Snapshot branch differs from target | Stop |
| Readback after rollback differs from snapshot | Treat rollback as failed and record the mismatch |
| Snapshot contains secrets | Stop and redesign snapshot format |
| Remote module set includes unexpected files | Record them and decide whether to preserve or remove before deployment |

### 5. Good/Base/Bad Cases

- Good: previous remote module set is captured, deployment fails, rollback restores the captured module set and readback hash matches.
- Base: no deployment is performed; rollback snapshot is not needed.
- Bad: local Git history is used as the only rollback plan for already uploaded Screeps code.

### 6. Tests Required

Rollback tooling requires:

- Unit tests for snapshot shape and hash calculation.
- Unit tests for branch mismatch.
- System tests proving snapshots are ignored by Git.
- Integration tests with a mocked Screeps API boundary.

### 7. Wrong vs Correct

#### Wrong

```text
git checkout HEAD~1
# Assume Screeps production reverted.
```

#### Correct

```text
restore captured remote modules
read back remote modules
compare rollback snapshot hash
record result
```
