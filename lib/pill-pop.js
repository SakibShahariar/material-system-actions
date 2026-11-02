// SPDX-License-Identifier: GPL-2.0-or-later

export function runPillPop(widget, keyframes) {
    if (!widget || typeof widget.ease !== 'function')
        return Promise.resolve();

    const runId = (widget._saPillPopRunId ?? 0) + 1;
    widget._saPillPopRunId = runId;

    // Stop the previous scale animation before starting the replacement.
    try { widget.remove_all_transitions(); } catch (_e) {}
    try { widget.set_scale(1, 1); } catch (_e) {}

    let run = Promise.resolve();
    for (const [scale, duration, mode] of keyframes) {
        run = run.then(() => {
            // A cancelled sequence must not schedule any remaining keyframes.
            if (widget._saPillPopRunId !== runId)
                return;
            try {
                return Promise.resolve(widget.ease(
                    {scale_x: scale, scale_y: scale},
                    {duration, mode},
                )).catch(() => {});
            } catch (_e) {
                return Promise.resolve();
            }
        });
    }

    return run.then(() => {
        if (widget._saPillPopRunId === runId) {
            try { widget.set_scale(1, 1); } catch (_e) {}
        }
    });
}
