// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Coalesce rapid calls into one trailing call. Scheduling is injected so the
 * behavior can be tested without a GLib main loop.
 */
export function createDebouncer(delayMs, callback, schedule, cancel) {
    let pendingId = 0;

    const debounce = (...args) => {
        if (pendingId) cancel(pendingId);
        pendingId = schedule(delayMs, () => {
            pendingId = 0;
            callback(...args);
        });
        return pendingId;
    };
    debounce.cancel = () => {
        if (pendingId) {
            cancel(pendingId);
            pendingId = 0;
        }
    };
    return debounce;
}
