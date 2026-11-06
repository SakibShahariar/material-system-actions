# Node module coverage baseline

Initial baseline recorded 2026-11-06 from the successful GitHub Actions run [42203018612](https://github.com/SakibShahariar/material-system-actions/actions/runs/42203018612), commit [75f6b1a](https://github.com/SakibShahariar/material-system-actions/commit/75f6b1a7bc2bfe5c50a0ee720d80aefa4c85cee6).

## Command and scope

CI uses Node.js 22 and runs:

```bash
node --test --experimental-test-coverage --test-coverage-include='lib/**/*.js' tests/*.test.mjs
```

The report includes Node-compatible `lib/**/*.js` modules loaded by the test suite. It is an informational baseline; no arbitrary coverage threshold is enforced. A file that is not imported by the Node tests does not appear as a zero-percent row.

## Overall baseline

| Metric | Baseline |
|---|---:|
| Line coverage | **99.17%** |
| Branch coverage | **95.41%** |
| Function coverage | **97.87%** |
| Tests passed | **93 / 93** |

## Module-level results

| Module | Lines | Branches | Functions | Uncovered lines |
|---|---:|---:|---:|---|
| `action-feedback.js` | 100.00% | 100.00% | 100.00% | — |
| `action-ids.js` | 100.00% | 100.00% | 100.00% | — |
| `action-preferences.js` | 100.00% | 96.30% | 100.00% | — |
| `custom-actions.js` | 100.00% | 97.37% | 100.00% | — |
| `focus-preferences.js` | 100.00% | 100.00% | 100.00% | — |
| `hibernate-capability.js` | 100.00% | 100.00% | 100.00% | — |
| `inhibitors.js` | 100.00% | 100.00% | 100.00% | — |
| `layouts/metadata.js` | 100.00% | 100.00% | 100.00% | — |
| `motion.js` | 100.00% | 100.00% | 100.00% | — |
| `pill-pop.js` | 94.44% | 57.14% | 75.00% | 26–27 |
| `process-tracker.js` | 94.44% | 87.50% | 100.00% | 27–28 |
| `settings-reset.js` | 100.00% | 100.00% | 100.00% | — |
| `status-header.js` | 100.00% | 100.00% | 100.00% | — |
| `switch-users.js` | 100.00% | 97.14% | 100.00% | — |
| `theme-colors.js` | 100.00% | 100.00% | 100.00% | — |

## Modules outside Node coverage

The following modules depend on GJS/GNOME Shell or GTK/libadwaita and are not imported by the Node test runner. They are **not** represented by the percentages above and must be checked in a live GNOME session using [DEVELOPING.md](../../DEVELOPING.md):

- `extension.js`, `prefs.js`
- `lib/actions.js`, `lib/dialog.js`, `lib/process.js`, `lib/theme.js`
- `lib/layouts/registry.js` and `lib/layouts/*.js`

This exclusion is intentional: Node coverage must not imply that Shell/GJS integration paths are tested. The live-session checklist is the validation source for those paths.

## Maintenance policy

- Add tests for uncovered branches when they represent meaningful behavior; do not write tests solely to inflate percentages.
- Keep the Node/GJS boundary explicit. Add GJS integration tests only when a suitable GNOME test environment is available.
- Re-record this baseline when the test set or module scope changes materially. Compare line, branch, and function coverage separately.
- Do not mark an uninstrumented GJS module as covered or as 0%; record its runtime validation status in the issue backlog instead.
