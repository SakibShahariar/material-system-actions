// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {ProcessTracker} from '../lib/process-tracker.js';

test('completion removes a subprocess wait from tracking', () => {
    const tracker = new ProcessTracker();
    const child = {};
    const cancellable = {cancelled: false, cancel() { this.cancelled = true; }};
    tracker.track(child, cancellable);
    assert.equal(tracker.size, 1);
    tracker.complete(child);
    assert.equal(tracker.size, 0);
    assert.equal(cancellable.cancelled, false);
});

test('disable cancels wait operations but never terminates child processes', () => {
    const tracker = new ProcessTracker();
    const child = {terminated: false};
    const cancellable = {cancelled: false, cancel() { this.cancelled = true; }};
    tracker.track(child, cancellable);
    assert.equal(tracker.cancelWaits(), 1);
    assert.equal(cancellable.cancelled, true);
    assert.equal(child.terminated, false);
    assert.equal(tracker.size, 0);
    assert.equal(tracker.cancelWaits(), 0);
});
