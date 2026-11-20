// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Track extension-owned wait operations without owning the lifetime of the
 * child processes themselves. Disabling the extension cancels waits, not work.
 * Custom actions additionally carry metadata so the user can inspect and
 * terminate them explicitly.
 */
export class ProcessTracker {
    constructor() {
        this._waits = new Map();
    }

    track(process, cancellable, meta = null) {
        this._waits.set(process, {cancellable, meta});
    }

    complete(process) {
        this._waits.delete(process);
    }

    cancelWaits() {
        const entries = [...this._waits.values()];
        this._waits.clear();
        for (const {cancellable} of entries) {
            try {
                cancellable.cancel();
            } catch (_error) {
                // Cleanup is best-effort; the child process is intentionally left running.
            }
        }
        return entries.length;
    }

    listRunning() {
        const result = [];
        for (const [process, {meta}] of this._waits) {
            if (meta?.id) result.push({id: meta.id, label: meta.label ?? 'Custom action', process});
        }
        return result;
    }

    terminate(id) {
        for (const [process, {meta}] of this._waits) {
            if (meta?.id !== id) continue;
            try {
                process.force_exit();
                return true;
            } catch (_error) {
                return false;
            }
        }
        return false;
    }

    get size() {
        return this._waits.size;
    }
}
