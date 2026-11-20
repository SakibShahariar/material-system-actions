// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILTIN_ACTION_IDS} from '../lib/action-ids.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('hybrid sleep is a built-in id with a reserved shortcut', () => {
    assert.ok(BUILTIN_ACTION_IDS.includes('hybrid-sleep'));
    const custom = read('../lib/custom-actions.js');
    assert.match(custom, /RESERVED_KEYS = new Set\(\[[^\]]*'y'/);
});

test('hybrid sleep is discovered from logind and hidden when unavailable', () => {
    const source = read('../lib/actions.js');
    assert.match(source, /function canHybridSleep\(\)/);
    assert.match(source, /'CanHybridSleep'/);
    assert.match(source, /isHibernateCapabilityAvailable\(reply\.deep_unpack\(\)\[0\]\)/);
    assert.match(source, /if \(canHybridSleep\(\)\)/);
    assert.match(source, /id: 'hybrid-sleep'[\s\S]*?destructive: true, key: 'y'/);
    assert.match(source, /cmd: \['systemctl', 'hybrid-sleep'\]/);
});

test('hybrid sleep can be selected as the initial focus', () => {
    const prefs = read('../prefs.js');
    assert.match(prefs, /'hibernate', 'hybrid-sleep', 'reboot'/);
    assert.match(prefs, /'Hibernate', 'Hybrid Sleep', 'Reboot'/);
});
