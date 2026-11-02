// SPDX-License-Identifier: GPL-2.0-or-later

export function selectInitialFocusWidget(widgets, preferredId = 'auto') {
    if (!Array.isArray(widgets))
        return null;
    const candidates = widgets.filter(widget =>
        widget && widget.visible !== false && widget.can_focus !== false);
    if (preferredId && preferredId !== 'auto') {
        const preferred = candidates.find(widget => widget._saActionId === preferredId);
        if (preferred)
            return preferred;
    }
    return candidates[0] ?? null;
}
