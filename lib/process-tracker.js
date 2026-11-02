// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Track extension-owned wait operations without owning the lifetime of the
 * child processes themselves. Disabling the extension cancels waits, not work.
 */
export class ProcessTracker {
    constructor() {
        this._waits = new Map();
    }

    track(process, cancellable) {
        this._waits.set(process, cancellable);
    }

    complete(process) {
        this._waits.delete(process);
    }

    cancelWaits() {
        const cancellables = [...this._waits.values()];
        this._waits.clear();
        for (const cancellable of cancellables) {
            try {
                cancellable.cancel();
            } catch (_error) {
                // Cleanup is best-effort; the child process is intentionally left running.
            }
        }
        return cancellables.length;
    }

    get size() {
        return this._waits.size;
    }
}
