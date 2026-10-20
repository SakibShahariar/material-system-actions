// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Apply the user's ordering and visibility preferences to discovered actions.
 * Unknown configured IDs are ignored; newly discovered actions are appended.
 */
export function applyActionPreferences(discovered, settings = null) {
    if (!settings)
        return [...discovered];

    const byId = new Map(discovered.map(action => [action.id, action]));
    const seen = new Set();
    const ordered = [];

    for (const id of settings.get_strv('action-order')) {
        const action = byId.get(id);
        if (action && !seen.has(id)) {
            ordered.push(action);
            seen.add(id);
        }
    }

    for (const action of discovered) {
        if (!seen.has(action.id)) {
            ordered.push(action);
            seen.add(action.id);
        }
    }

    const hidden = new Set(settings.get_strv('hidden-actions'));
    return ordered.filter(action => !hidden.has(action.id));
}

/** Normalize a preference list against currently available actions. */
export function normalizeActionOrder(availableActions, configuredOrder) {
    const available = new Set(availableActions.map(action => action.id));
    const seen = new Set();
    const order = [];
    for (const id of configuredOrder) {
        if (available.has(id) && !seen.has(id)) {
            order.push(id);
            seen.add(id);
        }
    }
    for (const action of availableActions) {
        if (!seen.has(action.id)) {
            order.push(action.id);
            seen.add(action.id);
        }
    }
    return order;
}
