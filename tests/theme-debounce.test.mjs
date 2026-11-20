// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDebouncer} from '../lib/debounce.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('rapid calls collapse into one trailing call with the latest arguments', () => {
    const fired = [];
    const cancelled = [];
    let nextId = 0;
    let scheduled;
    const debounce = createDebouncer(
        250,
        (...args) => fired.push(args),
        (delay, fn) => { scheduled = {delay, fn}; return ++nextId; },
        id => cancelled.push(id),
    );

    debounce('first');
    debounce('second');
    assert.deepEqual(cancelled, [1], 'the first pending call is cancelled');
    assert.equal(scheduled.delay, 250);
    scheduled.fn();
    assert.deepEqual(fired, [['second']]);
});

test('cancel prevents a pending call from firing', () => {
    let fired = 0;
    let scheduled;
    const debounce = createDebouncer(250, () => fired++, () => { scheduled = true; return 7; }, () => {});
    debounce();
    debounce.cancel();
    assert.equal(fired, 0);
    assert.equal(scheduled, true);
});

test('dialog debounces Matugen file changes and cleans up on close', () => {
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /createDebouncer\(\s*250,/);
    assert.match(dialog, /getThemeSourcePaths\(\)/);
    assert.match(dialog, /monitor\.connect\('changed', \(\) => this\._reloadTheme\(\)\)/);
    assert.match(dialog, /this\._reloadTheme\?\.cancel\(\)/);
    assert.match(dialog, /for \(const monitor of this\._themeMonitors \?\? \[\]\)/);
});
