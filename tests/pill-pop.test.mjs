// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {runPillPop} from '../lib/pill-pop.js';

test('a new pill pop cancels the old sequence and restores unit scale', async () => {
    const pending = [];
    const calls = [];
    const widget = {
        _saPillPopRunId: 0,
        removals: 0,
        scale: null,
        remove_all_transitions() { this.removals++; },
        set_scale(x, y) { this.scale = [x, y]; },
        ease(properties) {
            calls.push(properties.scale_x);
            return new Promise(resolve => pending.push(resolve));
        },
    };
    const keyframes = [
        [0.94, 150, 'ease'],
        [1.08, 180, 'ease'],
        [0.96, 120, 'ease'],
        [1.03, 90, 'ease'],
        [1.0, 60, 'ease'],
    ];

    const first = runPillPop(widget, keyframes);
    await Promise.resolve();
    assert.deepEqual(calls, [0.94]);

    const second = runPillPop(widget, keyframes);
    assert.equal(widget.removals, 2);
    assert.deepEqual(widget.scale, [1, 1]);
    await Promise.resolve();
    assert.deepEqual(calls, [0.94, 0.94]);

    pending[0]();
    await first;
    assert.deepEqual(calls, [0.94, 0.94]);

    const flush = async () => { for (let tick = 0; tick < 8; tick++) await Promise.resolve(); };
    for (let i = 1; i <= keyframes.length; i++) {
        pending[i]();
        await flush();
    }
    await second;

    assert.deepEqual(calls, [0.94, 0.94, 1.08, 0.96, 1.03, 1.0]);
    assert.deepEqual(widget.scale, [1, 1]);
});
