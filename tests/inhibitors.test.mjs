// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {getSleepInhibitors} from '../lib/inhibitors.js';

test('keeps only sleep block/delay inhibitors and groups details by application', () => {
    const inhibitors = getSleepInhibitors([
        ['sleep:idle', 'Firefox', 'Download in progress', 'block', 1000, 123],
        ['sleep:shutdown', 'Firefox', 'Background update', 'delay', 1000, 123],
        ['sleep:idle', 'Music player', 'Playback active', 'block', 1000, 456],
        ['shutdown', 'Session manager', 'Logout', 'block', 1000, 789],
        ['sleep:idle', 'Indexer', 'Indexing', 'notify', 1000, 321],
    ]);

    assert.deepEqual(inhibitors, [
        {
            what: 'sleep:idle, sleep:shutdown',
            who: 'Firefox',
            why: 'Download in progress; Background update',
            mode: 'block, delay',
        },
        {
            what: 'sleep:idle',
            who: 'Music player',
            why: 'Playback active',
            mode: 'block',
        },
    ]);
});

test('missing application and reason metadata receive safe fallback labels', () => {
    assert.deepEqual(getSleepInhibitors([
        ['sleep:idle', '', '', 'block', 1000, 123],
    ]), [{
        what: 'sleep:idle',
        who: 'Unknown application',
        why: 'No reason provided',
        mode: 'block',
    }]);
});

test('malformed inhibitor input degrades to an empty list', () => {
    assert.deepEqual(getSleepInhibitors(null), []);
    assert.deepEqual(getSleepInhibitors([
        null,
        ['sleep:idle', 'app', 'reason', 'notify', 1000, 123],
        ['shutdown', 'app', 'reason', 'block', 1000, 123],
        ['sleep:idle', 'app', 'reason', 'block'],
    ]), [{
        what: 'sleep:idle',
        who: 'app',
        why: 'reason',
        mode: 'block',
    }]);
});
