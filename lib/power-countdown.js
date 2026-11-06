// SPDX-License-Identifier: GPL-2.0-or-later

export const POWER_ACTION_COUNTDOWN_SECONDS = 5;

export function formatPowerActionCountdown(actionId, secondsRemaining) {
    if (!['reboot', 'shutdown'].includes(actionId))
        throw new RangeError('Countdown is only available for reboot and shutdown');
    if (!Number.isInteger(secondsRemaining) || secondsRemaining < 1)
        throw new RangeError('Countdown seconds must be a positive integer');

    const label = actionId === 'reboot' ? 'Restarting' : 'Shutting down';
    return label + ' in ' + secondsRemaining + ' seconds. Cancel to abort.';
}

export function createCountdownTick(seconds, onTick, onComplete) {
    if (!Number.isInteger(seconds) || seconds < 1)
        throw new RangeError('Countdown duration must be a positive integer');
    if (typeof onTick !== 'function' || typeof onComplete !== 'function')
        throw new TypeError('Countdown callbacks are required');

    let remaining = seconds;
    let completed = false;
    return () => {
        if (completed)
            return false;
        remaining -= 1;
        if (remaining <= 0) {
            completed = true;
            onComplete();
            return false;
        }
        onTick(remaining);
        return true;
    };
}
