// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    POWER_ACTION_COUNTDOWN_SECONDS,
    createCountdownTick,
    formatPowerActionCountdown,
} from '../lib/power-countdown.js';

test('shutdown and reboot countdown messages are explicit and cancellable', () => {
    assert.equal(POWER_ACTION_COUNTDOWN_SECONDS, 5);
    assert.equal(formatPowerActionCountdown('reboot', 5), 'Restarting in 5 seconds. Cancel to abort.');
    assert.equal(formatPowerActionCountdown('shutdown', 2), 'Shutting down in 2 seconds. Cancel to abort.');
    assert.throws(() => formatPowerActionCountdown('hibernate', 5), /only available for reboot and shutdown/);
    assert.throws(() => formatPowerActionCountdown('shutdown', 0), /positive integer/);
});

test('countdown ticks once per second and completes exactly once', () => {
    const updates = [];
    let completed = 0;
    const tick = createCountdownTick(3, value => updates.push(value), () => completed++);
    assert.equal(tick(), true);
    assert.equal(tick(), true);
    assert.equal(tick(), false);
    assert.equal(tick(), false);
    assert.deepEqual(updates, [2, 1]);
    assert.equal(completed, 1);
});

test('countdown rejects invalid durations and callbacks', () => {
    assert.throws(() => createCountdownTick(0, () => {}, () => {}), /positive integer/);
    assert.throws(() => createCountdownTick(3, null, () => {}), /callbacks are required/);
});
