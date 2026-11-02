// SPDX-License-Identifier: GPL-2.0-or-later

export function getStateTransitionDuration(animationsEnabled, durationMs) {
    const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
    return animationsEnabled ? duration : 0;
}
