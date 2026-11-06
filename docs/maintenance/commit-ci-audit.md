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
- Checkpoint SHA: `e1440d99a3c264918cc7085875b11caa04812c77`
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



## 2026-11-06 incremental audit

Reviewed every commit after the prior checkpoint `0b3ee9538fbfbe59f349ce2e2050421b71125305` through `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81`: 51 commits, each with an observed completed push workflow. Results: 37 green and 14 red. All 14 red runs and their job logs were inspected; the later corrective commits listed below have green runs. The historical red records remain red and are not rewritten as green. The latest corrective commit `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81` passed run [42200133934](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200133934), including all 69 Node tests, strict schema compilation, package creation, and archive validation.

| Failed commit SHA | Subject | Failed run / step | Diagnosis | Corrective commit and observed green run |
|---|---|---|---|---|
| `4a462acff5d731b0b1dd3333afa0f9afccae5abe` | `fix(packaging): validate inputs and emit SHA-256 checksum (#85, #86)` | [41497442637](https://github.com/SakibShahariar/material-system-actions/actions/runs/41497442637), archive validation | ZIP output was structurally invalid. | `3b19c6dde30cb8e5e2abdd90d8f08f008c720b85` removes the empty archive placeholder; [41497518965](https://github.com/SakibShahariar/material-system-actions/actions/runs/41497518965) passed. |
| `d774409eae2f78a33c676ce2b2741e5272f01cbe` | `test(packaging): cover preflight and checksum output (#85, #86)` | [41497466037](https://github.com/SakibShahariar/material-system-actions/actions/runs/41497466037), archive validation | Same invalid ZIP placeholder failure. | `3b19c6dde30cb8e5e2abdd90d8f08f008c720b85`; [41497518965](https://github.com/SakibShahariar/material-system-actions/actions/runs/41497518965) and [41497593034](https://github.com/SakibShahariar/material-system-actions/actions/runs/41497593034) passed. |
| `12a3a5bc5fbd39aa58ccd94abbba26a69e917143` | `fix(theme): support short and alpha hex colors (#78)` | [41498055877](https://github.com/SakibShahariar/material-system-actions/actions/runs/41498055877), theme color test | Test expected an eight-digit hex string, while implementation correctly returned equivalent RGBA; follow-up preserved opaque hex values where possible. | `aeba98775cd4ce4c7cec9ac84fbef41dadfde524`; [41498084609](https://github.com/SakibShahariar/material-system-actions/actions/runs/41498084609) passed. |
| `23236ad3ca4adf7ec4d0614070915c8796a6c385` | `test(custom-actions): cover hostile configuration limits (#71)` | [41498670844](https://github.com/SakibShahariar/material-system-actions/actions/runs/41498670844), custom-action validation test | Invalid icon fixture did not exercise the intended length boundary. | `c9a7b8a92ba2345eb8c15ffec2c6d43a4c225293` corrects the fixture; [41498780033](https://github.com/SakibShahariar/material-system-actions/actions/runs/41498780033) passed. |
| `3b3e8b291f64003c9d8241c684de089e20bab2d4` | `chore(metadata): add issue tracker link (#69)` | [41498734798](https://github.com/SakibShahariar/material-system-actions/actions/runs/41498734798), custom-action validation test | Inherited the same invalid icon-length fixture failure; metadata change was unrelated. | `c9a7b8a92ba2345eb8c15ffec2c6d43a4c225293`; [41498780033](https://github.com/SakibShahariar/material-system-actions/actions/runs/41498780033) passed. |
| `d4653830d8dee86afae674bbda28d8558e67bd81` | `fix(ui): unify focus and pressed-state timing (#73)` | [41499802566](https://github.com/SakibShahariar/material-system-actions/actions/runs/41499802566), accessibility test | Source assertion used an incorrectly escaped regex for the pressed-timeout property. | `ce50cf02dcbf42be093d07c477eae3c642bc346f` corrected the shared timing contract test; [41499853725](https://github.com/SakibShahariar/material-system-actions/actions/runs/41499853725) passed. |
| `b96d25125ac2a0e34416688e075bd07308cd85f4` | `fix(packaging): make extension archives reproducible (#84)` | [41500501588](https://github.com/SakibShahariar/material-system-actions/actions/runs/41500501588), relative-output archive validation | ZIP validation reported an invalid temporary archive. Exact initiating cause is inconclusive from the available job output; do not overstate the diagnosis. | Subsequent packaging commit `1751ca5bc03e9911eb5e9868fd5f0bb0f9a0324a` passed [41500687967](https://github.com/SakibShahariar/material-system-actions/actions/runs/41500687967); later packaging runs also passed. |
| `82a33a5f29d000651ab6b3ba8f6a917914cda2ae` | `feat(switch-user): confirm before session activation (#83)` | [41501606994](https://github.com/SakibShahariar/material-system-actions/actions/runs/41501606994), switch-user test | Test expected `destructive: false`; implementation marked switch-user actions destructive to route them through confirmation. | `bfce2ab38c3523854e08c4fac03d1ac732149d4d` updated the test expectation; [41502086539](https://github.com/SakibShahariar/material-system-actions/actions/runs/41502086539) passed. |
| `2946bb6ebc42f3c298fbbd3850d51e447fe8bb07` | `feat(ui): show recovery state when all actions are hidden (#35)` | [41502518075](https://github.com/SakibShahariar/material-system-actions/actions/runs/41502518075), accessibility test | Test expected the old `allHidden:` source shape after implementation had changed to a computed `const allHidden`. | `10fedbd1b38148ff39f35a17c726e5d52333b8c0` corrected the assertion; [41502541623](https://github.com/SakibShahariar/material-system-actions/actions/runs/41502541623) passed. |
| `c6cef2f9084381e437990c7f32bc39015fcc5464` | `fix(actions): clean up subprocess wait tracking on disable (#54)` | [41505371119](https://github.com/SakibShahariar/material-system-actions/actions/runs/41505371119), process lifecycle contract test | Test asserted the old cancellation call location in `process.js`; lifecycle tracking had been extracted to its own tracker module. | `58b768982f10a668dd0596fe06892bac1ac65bef` added tracker-focused contract coverage; [41505561058](https://github.com/SakibShahariar/material-system-actions/actions/runs/41505561058) passed. |
| `8417abb31542f22e2fdd5d7c74cbe3b509b7acea` | `fix(a11y): respect reduced motion in sheet transitions (#34)` | [41505769127](https://github.com/SakibShahariar/material-system-actions/actions/runs/41505769127), accessibility test | Test expected the old literal duration interpolation instead of the computed reduced-motion-aware `stateDuration`. | `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81` corrected the assertion; [42200133934](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200133934) passed. |
| `fc9bb8b70f3192a7935a82f130dc5261a0565c1e` | `docs: define issue triage categories` | [41573430196](https://github.com/SakibShahariar/material-system-actions/actions/runs/41573430196), accessibility test | Inherited the same stale reduced-motion duration assertion; documentation change was unrelated. | `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81`; [42200133934](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200133934) passed. |
| `7c46e88cfbd16d4114f2895ec3171b6c345805e3` | `docs(agents): define administrative commit hygiene` | [41598011564](https://github.com/SakibShahariar/material-system-actions/actions/runs/41598011564), accessibility test | Inherited the same stale reduced-motion duration assertion; documentation change was unrelated. | `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81`; [42200133934](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200133934) passed. |
| `32405789216b249df0d9b877d7ac4f346f488e52` | `docs(agents): clarify acceptance criteria evidence` | [41864139558](https://github.com/SakibShahariar/material-system-actions/actions/runs/41864139558), accessibility test | Inherited the same stale reduced-motion duration assertion; documentation change was unrelated. | `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81`; [42200133934](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200133934) passed. |

- Corrective commit for the repeated reduced-motion assertion: `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81`; exact run [42200133934](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200133934) completed successfully.
- Audit checkpoint advanced to `d5f8bd9520018b9a93ed5dca93a6ed366fcd2b81` after all 51 commits and their workflow results were reviewed.
- Remaining runtime limitation: no live GNOME Shell / Orca session was available in this maintenance environment.


## 2026-11-06 structured layout metadata CI follow-up

Two consecutive commits for issue #89 were checked and both failed at the JavaScript syntax step because the new Preferences metadata import contained a literal escaped newline between import statements. This is a source syntax defect introduced by the metadata integration, not an environment failure. The next corrective commit replaces that literal sequence with a real line break. Both failed runs are preserved as red; the corrective commit's CI must pass before the metadata work is considered verified.

| Commit SHA | Subject | CI result | Workflow run | Failed step | Classification / follow-up |
|---|---|---|---|---|---|
| `e29b9887e8da4fb72e8188c251d85f7be654d6be` | `feat(layouts): centralize structured layout metadata (#89)` | red | [42200578522](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200578522) | Validate JavaScript syntax | Literal escaped newline in the new Preferences import. The commit also initially omitted the metadata module and had escaped README row separators; those were addressed in the following correction. |
| `c668d1fd523d67d45a42093bfdde355eb3f7a1f6` | `fix(layouts): add shared metadata source and repair catalog (#89)` | red | [42200713785](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200713785) | Validate JavaScript syntax | Same uncorrected Preferences import escape; corrected in the next commit. |

- Corrective change: replace the literal `\\n` between import statements in `prefs.js` with an actual newline.
- Corrective commit and final CI result: pending.


## 2026-11-06 structured layout metadata verification

Reviewed the three commits after the previous checkpoint through `37c8ee19d31aa2dea1ffbcee617759ac90cf299c`. Both initial metadata commits failed JavaScript syntax validation due a literal escaped newline in the Preferences import; the final corrective commit fixed the import and passed the complete workflow. The two failed runs remain recorded as red.

| Commit SHA | Subject | CI result | Workflow run | Diagnosis / resolution |
|---|---|---|---|---|
| `e29b9887e8da4fb72e8188c251d85f7be654d6be` | `feat(layouts): centralize structured layout metadata (#89)` | red | [42200578522](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200578522) | Literal escaped newline in `prefs.js` import; initial commit also omitted `metadata.js` and used literal README separators. |
| `c668d1fd523d67d45a42093bfdde355eb3f7a1f6` | `fix(layouts): add shared metadata source and repair catalog (#89)` | red | [42200713785](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200713785) | Same escaped newline remained in `prefs.js`; fixed in the next commit. |
| `37c8ee19d31aa2dea1ffbcee617759ac90cf299c` | `fix(prefs): separate layout metadata import statement (#89)` | green | [42200836907](https://github.com/SakibShahariar/material-system-actions/actions/runs/42200836907) | JavaScript syntax, Node tests, strict schema compilation, archive build, and archive validation all passed. |

Issue #89 was re-fetched after its implementation evidence was added, then closed as completed. Live GNOME visual validation is not part of this metadata issue's acceptance criteria.


## 2026-11-06 grouped reset controls verification

Reviewed the commit after the prior checkpoint. Issue #67's grouped reset implementation uses `Gio.Settings.reset()` for schema-defined defaults and passed all 78 Node tests, strict schema compilation, syntax checks, package build, and archive validation.

| Commit SHA | Subject | CI result | Workflow run | Follow-up |
|---|---|---|---|---|
| `e1440d99a3c264918cc7085875b11caa04812c77` | `feat(prefs): add grouped reset-to-defaults controls (#67)` | green | [42201104316](https://github.com/SakibShahariar/material-system-actions/actions/runs/42201104316) | Category B; live GTK/libadwaita reset-dialog and control-refresh checks remain open in issue #67. |
