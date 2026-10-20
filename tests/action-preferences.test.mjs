// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {applyActionPreferences} from '../lib/action-preferences.js';

const makeSettings = (order, hidden = []) => ({
    get_strv(key) {
        if (key === 'action-order') return [...order];
        if (key === 'hidden-actions') return [...hidden];
        throw new Error(`Unexpected setting: ${key}`);
    },
});
const actions = ['lock', 'logout', 'suspend', 'reboot', 'shutdown']
    .map(id => ({id}));

test('preserves discovered order when settings are unavailable', () => {
    assert.deepEqual(
        applyActionPreferences(actions.slice(0, 2)).map(action => action.id),
        ['lock', 'logout'],
    );
});

test('applies configured order and visibility', () => {
    const result = applyActionPreferences(actions, makeSettings(
        ['shutdown', 'lock', 'reboot', 'suspend', 'logout'],
        ['reboot', 'logout'],
    ));
    assert.deepEqual(result.map(action => action.id), ['shutdown', 'lock', 'suspend']);
});

test('ignores unknown and duplicate IDs and appends new actions', () => {
    const discovered = [...actions, {id: 'hibernate'}];
    const result = applyActionPreferences(discovered, makeSettings(
        ['shutdown', 'missing', 'shutdown', 'lock'],
    ));
    assert.deepEqual(result.map(action => action.id),
        ['shutdown', 'lock', 'logout', 'suspend', 'reboot', 'hibernate']);
});

test('hiding every configured action produces an empty list', () => {
    assert.deepEqual(
        applyActionPreferences(actions, makeSettings(
            ['lock', 'logout', 'suspend', 'reboot', 'shutdown'],
            actions.map(action => action.id),
        )),
        [],
    );
});

import {parseCustomActions} from '../lib/custom-actions.js';

test('parses custom commands and defaults confirmation to enabled', () => {
    const parsed = parseCustomActions(JSON.stringify([
        {id: 'custom-backup', label: 'Backup', icon: 'document-save-symbolic', cmd: ['/home/user/backup']},
        {id: 'custom-vpn', label: 'VPN', icon: 'network-vpn-symbolic', cmd: ['nmcli', 'connection', 'up', 'Work'], confirm: false, key: 'v'},
    ]));
    assert.equal(parsed[0].destructive, true);
    assert.equal(parsed[0].key, null);
    assert.deepEqual(parsed[0].cmd, ['/home/user/backup']);
    assert.equal(parsed[1].destructive, false);
    assert.equal(parsed[1].key, 'v');
});

test('rejects malformed JSON and invalid command formats', () => {
    assert.throws(() => parseCustomActions('{'), /valid JSON/);
    assert.throws(() => parseCustomActions(JSON.stringify([{id: 'custom-x', label: 'X', icon: 'power-symbolic', cmd: 'shutdown'}])), /cmd must be/);
    assert.throws(() => parseCustomActions(JSON.stringify([{id: 'custom-x', label: 'X', icon: 'power-symbolic', cmd: ['shutdown'], confirm: 'false'}])), /confirm must be/);
});

test('rejects duplicate IDs and shortcut collisions', () => {
    assert.throws(() => parseCustomActions(JSON.stringify([
        {id: 'custom-a', label: 'A', icon: 'power-symbolic', cmd: ['true']},
        {id: 'custom-a', label: 'B', icon: 'power-symbolic', cmd: ['true']},
    ])), /duplicate id/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        {id: 'custom-a', label: 'A', icon: 'power-symbolic', cmd: ['true'], key: 's'},
    ])), /already reserved/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        {id: 'custom-hibernate', label: 'Custom Hibernate', icon: 'power-symbolic', cmd: ['true'], key: 'h'},
    ])), /already reserved/);
});

import {isHibernateCapabilityAvailable} from '../lib/hibernate-capability.js';

test('shows Hibernate only when logind reports support or an authentication challenge', () => {
    assert.equal(isHibernateCapabilityAvailable('yes'), true);
    assert.equal(isHibernateCapabilityAvailable('challenge'), true);
    assert.equal(isHibernateCapabilityAvailable('no'), false);
    assert.equal(isHibernateCapabilityAvailable('na'), false);
    assert.equal(isHibernateCapabilityAvailable(undefined), false);
});

import {normalizeActionOrder} from '../lib/action-preferences.js';

test('normalizes preference order by dropping stale IDs and duplicates', () => {
    const available = [{id: 'lock'}, {id: 'custom-vpn'}, {id: 'shutdown'}];
    assert.deepEqual(
        normalizeActionOrder(available, ['custom-vpn', 'removed-action', 'lock', 'custom-vpn']),
        ['custom-vpn', 'lock', 'shutdown'],
    );
});
