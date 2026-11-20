// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createActionCache, mergeActions} from '../lib/action-cache.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('dynamic action discovery is cached with a TTL', () => {
    const cache = createActionCache(1000);
    assert.equal(cache.get(0), null);
    const actions = {session: [{id: 'switch-user-1'}], power: []};
    cache.set(actions, 0);
    assert.deepEqual(cache.get(500), actions);
    assert.equal(cache.get(1000), null);
    cache.clear();
    assert.equal(cache.get(500), null);
});

test('merge keeps built-in and dynamic actions without duplicates', () => {
    const merged = mergeActions({session: [{id: 'lock'}], power: [{id: 'suspend'}]}, {session: [{id: 'lock'}, {id: 'switch-user-1'}], power: [{id: 'hibernate'}]});
    assert.deepEqual(
        merged.session.map(a => a.id),
        ['lock', 'switch-user-1']
    );
    assert.deepEqual(
        merged.power.map(a => a.id),
        ['suspend', 'hibernate']
    );
});

test('popup action list reads the cache instead of discovering synchronously', () => {
    const actions = read('../lib/actions.js');
    const body = actions.slice(actions.indexOf('export function getActions'));
    assert.match(body, /getCachedDynamicActions\(\)/);
    assert.doesNotMatch(body, /getSwitchUserActions\(|canHibernate\(|canHybridSleep\(/);
    const extension = read('../extension.js');
    assert.match(extension, /discoverDynamicActions\(this\._settings\)/);
    assert.match(extension, /GLib\.idle_add/);
});
