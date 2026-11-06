# Commit CI Audit Ledger

Persistent repository-specific record of commit-level CI checks and red-cross investigations.

## How to use this ledger

1. Read this file before auditing commit checks.
2. Check only commits newer than the checkpoint, plus older **red**, **pending**, or explicitly unresolved entries.
3. Record exact commit SHAs and observed results; never infer from missing badges or empty API responses.
4. Preserve failures and append diagnosis, fix, rerun, and final-outcome evidence.
5. Advance the checkpoint only after reviewing the range; carry unresolved entries forward.

## Result meanings

| Result | Meaning |
|---|---|
| **green** | Completed successful check/run directly observed. |
| **red** | Completed failing check/run directly observed. |
| **pending** | Check/run exists but is unfinished. |
| **unavailable** | Available evidence did not expose a result; not a pass or failure. |
| **not applicable** | Workflow configuration confirms no relevant check is triggered. |

## Checkpoint

- Repository: `SakibShahariar/material-system-actions`
- Default branch: `main`
- Checkpoint SHA: `0b3ee9538fbfbe59f349ce2e2050421b71125305`
- Initialized: 2026-11-02
- Baseline: latest branch tip queried through combined commit-status endpoint; empty status list recorded as **unavailable**, not green/red. Older history was not retroactively audited during setup.
- Next session: review commits after this checkpoint, including the ledger and `AGENTS.md` setup commits; investigate any older red/pending commit specifically identified by the owner.

## Initial baseline

| Commit SHA | Subject | CI result | Checked | Follow-up |
|---|---|---|---|---|
| `0b3ee9538fbfbe59f349ce2e2050421b71125305` | Default-branch tip at ledger initialization | unavailable | 2026-11-02 | Combined status lookup returned no entries. Revisit if new run or visible failure evidence appears. |

## Red-cross investigation log

No red result was confirmed from the status data retrieved during setup.

### Failure record template

- Commit SHA:
- Commit subject:
- First observed (date):
- Workflow / run URL:
- Failed job / step:
- Failure summary:
- Classification: regression / pre-existing / inconclusive
- Fix commit(s):
- Rerun attempt(s) and result:
- Final verified outcome:
- Remaining follow-up:

## Session history

| Date | Reviewed range / checkpoint | Result summary |
|---|---|---|
| 2026-11-02 | Initial checkpoint: `0b3ee9538fbfbe59f349ce2e2050421b71125305` | Latest commit queried; empty status response recorded as unavailable. Earlier history not retroactively audited. |


## 2026-11-06 investigation: repeated test failure

The following push runs were checked against their exact commit SHAs and job logs. All failed in `node --test tests/*.test.mjs`, at `tests/accessibility-and-preview.test.mjs:66`, because the assertion expected the obsolete literal `--sa-state-transition-duration: ${INTERACTION_STATE_DURATION_MS}ms;`. Current `lib/dialog.js` computes `stateDuration` through `getStateTransitionDuration(St.Settings.get().enable_animations, INTERACTION_STATE_DURATION_MS)` and injects that computed value. This is a stale test expectation; it does not establish a runtime regression. The corrective test now asserts the computed interpolation. The test suite must still be rerun on the corrective commit before any of these red entries can be considered resolved.

| Commit SHA | Subject | CI result | Workflow run | Failed step | Classification / follow-up |
|---|---|---|---|---|---|
| `8417abb31542f22e2fdd5d7c74cbe3b509b7acea` | `fix(a11y): respect reduced motion in sheet transitions (#34)` | red | [41505769127](https://github.com/SakibShahariar/material-system-actions/actions/runs/41505769127) | `node --test tests/*.test.mjs` | Stale assertion; corrected by test-only follow-up referencing #34. |
| `fc9bb8b70f3192a7935a82f130dc5261a0565c1e` | `docs: define issue triage categories` | red | [41573430196](https://github.com/SakibShahariar/material-system-actions/actions/runs/41573430196) | `node --test tests/*.test.mjs` | Same inherited stale assertion; documentation commit did not introduce it. |
| `7c46e88cfbd16d4114f2895ec3171b6c345805e3` | `docs(agents): define administrative commit hygiene` | red | [41598011564](https://github.com/SakibShahariar/material-system-actions/actions/runs/41598011564) | `node --test tests/*.test.mjs` | Same inherited stale assertion; documentation commit did not introduce it. |
| `32405789216b249df0d9b877d7ac4f346f488e52` | `docs(agents): clarify acceptance criteria evidence` | red | [41864139558](https://github.com/SakibShahariar/material-system-actions/actions/runs/41864139558) | `node --test tests/*.test.mjs` | Same inherited stale assertion; latest HEAD remains red until corrective CI completes. |

- Corrective commit: pending at time of ledger update.
- Final verified outcome: pending; do not mark the historical runs green. Verify the corrective commit's own CI and record whether the test failure is resolved.
