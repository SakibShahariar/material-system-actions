// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeDialogPosition, selectMonitor} from '../lib/dialog-position.js';

const monitors = [
    {x: 0, y: 0, width: 1920, height: 1080},
    {x: 1920, y: 0, width: 1280, height: 800}
];

test('monitor selection follows the pointer and falls back to primary', () => {
    assert.equal(selectMonitor(monitors, 100, 100, monitors[0]), monitors[0]);
    assert.equal(selectMonitor(monitors, 2000, 400, monitors[0]), monitors[1]);
    assert.equal(selectMonitor(monitors, 4000, 4000, monitors[0]), monitors[0]);
    assert.equal(selectMonitor([], 100, 100, monitors[1]), monitors[1]);
});

test('positions are computed relative to the selected monitor', () => {
    const monitor = monitors[1];
    assert.deepEqual(computeDialogPosition(monitor, 400, 300, null), {x: 2360, y: 250});
    assert.deepEqual(computeDialogPosition(monitor, 400, 300, 'top'), {x: 2360, y: 32});
    assert.deepEqual(computeDialogPosition(monitor, 400, 300, 'bottom'), {x: 2360, y: 468});
    assert.deepEqual(computeDialogPosition(monitor, 400, 300, 'left-edge'), {x: 1952, y: 250});
    assert.deepEqual(computeDialogPosition(monitor, 400, 300, 'fullscreen'), {x: 1920, y: 0});
    assert.equal(computeDialogPosition(null, 400, 300, 'top'), null);
});

test('dialog delegates positioning to the pure helpers', () => {
    const source = readFileSync(new URL('../lib/dialog.js', import.meta.url), 'utf8');
    assert.match(source, /import \{computeDialogPosition, selectMonitor\} from '\.\/dialog-position\.js'/);
    assert.match(source, /this\.dialogLayout\.set_position\(position\.x, position\.y\)/);
    assert.doesNotMatch(source, /case 'fullscreen':/);
});
