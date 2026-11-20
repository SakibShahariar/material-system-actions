// SPDX-License-Identifier: GPL-2.0-or-later

// Clutter.Actor.raise_top() is unavailable on newer GNOME Shell releases
// (verified on Shell 51), where a parent raises a child with
// set_child_above_sibling(child, null). Keep both paths so confirmation
// overlays work across the declared Shell 45-51 range.
export function raiseActorAboveSiblings(actor) {
    if (!actor) return false;

    try {
        if (typeof actor.raise_top === 'function') {
            actor.raise_top();
            return true;
        }

        const parent = typeof actor.get_parent === 'function' ? actor.get_parent() : null;
        if (parent && typeof parent.set_child_above_sibling === 'function') {
            parent.set_child_above_sibling(actor, null);
            return true;
        }
    } catch (_e) {
        // A destroyed actor must never abort the confirmation lifecycle.
    }
    return false;
}
