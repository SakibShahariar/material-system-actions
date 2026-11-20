// SPDX-License-Identifier: GPL-2.0-or-later

/** Pick the monitor containing the pointer, falling back to the primary one. */
export function selectMonitor(monitors, pointerX, pointerY, fallback = null) {
    if (!Array.isArray(monitors)) return fallback;
    return monitors.find(monitor => pointerX >= monitor.x && pointerX < monitor.x + monitor.width && pointerY >= monitor.y && pointerY < monitor.y + monitor.height) ?? fallback;
}

/** Compute the dialog origin for a layout position within the chosen monitor. */
export function computeDialogPosition(monitor, width, height, position, margin = 32) {
    if (!monitor) return null;
    let x = monitor.x + Math.floor((monitor.width - width) / 2);
    let y = monitor.y + Math.floor((monitor.height - height) / 2);
    switch (position) {
        case 'top':
            y = monitor.y + margin;
            break;
        case 'bottom':
            y = monitor.y + monitor.height - height - margin;
            break;
        case 'left-edge':
            x = monitor.x + margin;
            break;
        case 'fullscreen':
            x = monitor.x;
            y = monitor.y;
            break;
    }
    return {x, y};
}
