// SPDX-License-Identifier: GPL-2.0-or-later

/** Cache dynamic action discovery so opening the popup never waits on logind. */
export function createActionCache(ttlMs = 60000) {
    let cached = null;
    let cachedAt = 0;

    return {
        set(actions, now = Date.now()) {
            cached = actions;
            cachedAt = now;
        },
        get(now = Date.now()) {
            if (!cached || now - cachedAt >= ttlMs) return null;
            return cached;
        },
        clear() {
            cached = null;
            cachedAt = 0;
        }
    };
}

/** Merge built-ins with dynamic actions without duplicating ids. */
export function mergeActions(builtin, dynamic) {
    const seen = new Set();
    const merged = {session: [], power: []};
    for (const group of ['session', 'power']) {
        for (const action of [...(builtin[group] ?? []), ...(dynamic[group] ?? [])]) {
            if (!action?.id || seen.has(action.id)) continue;
            seen.add(action.id);
            merged[group].push(action);
        }
    }
    return merged;
}
