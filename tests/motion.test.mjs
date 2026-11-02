// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {getStateTransitionDuration} from '../lib/motion.js';

test('normal animations retain the configured transition duration', () => {
    assert.equal(getStateTransitionDuration(true, 140), 140);
});

test('disabled animations use an instantaneous transition', () => {
    assert.equal(getStateTransitionDuration(false, 140), 0);
});

test('invalid durations are safely normalized', () => {
    assert.equal(getStateTransitionDuration(true, -1), 0);
    assert.equal(getStateTransitionDuration(true, Number.NaN), 0);
});
