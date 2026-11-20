// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILTIN_ACTION_IDS} from '../lib/action-ids.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('lock-then-suspend is a regular built-in action that can be hidden', () => {
    assert.ok(BUILTIN_ACTION_IDS.includes('lock-suspend'));
    const actions = read('../lib/actions.js');
    assert.match(actions, /id: 'lock-suspend'[\s\S]*?destructive: false/);
    assert.match(actions, /cmd: \['loginctl', 'lock-session'\]/);
    assert.match(actions, /id: 'lock-suspend'[\s\S]*?key: 'c'/);
    assert.match(read('../lib/custom-actions.js'), /RESERVED_KEYS = new Set\(\[[^\]]*'c'/);
});

test('trigger locks first and then follows the suspend inhibitor flow', () => {
    const base = read('../lib/layouts/base.js');
    const handler = base.slice(base.indexOf("action.id === 'lock-suspend'"), base.indexOf("action.id === 'suspend'"));
    assert.match(handler, /spawnCommand\(\['loginctl', 'lock-session'\], 'Lock'\)/);
    assert.match(handler, /_querySleepInhibitors\(\)/);
    assert.match(handler, /_confirmSuspendWithInhibitors\(inhibitors, action\)/);
    assert.match(handler, /_run\(\['systemctl', 'suspend'\], action\.label\)/);
    assert.ok(handler.indexOf('spawnCommand') < handler.indexOf('_querySleepInhibitors'), 'lock must run before suspend discovery');
});

test('lock-then-suspend is selectable as the initial focus and documented', () => {
    const prefs = read('../prefs.js');
    assert.match(prefs, /'lock', 'lock-suspend', 'logout'/);
    assert.match(prefs, /'Lock', 'Lock & Suspend', 'Log out'/);
    const readme = read('../README.md');
    assert.match(readme, /Lock & Suspend/);
    assert.match(readme, /locks the session first/);
});
