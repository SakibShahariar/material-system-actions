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

import {getSleepInhibitors} from '../lib/inhibitors.js';

test('filters login1 inhibitors to sleep blockers and delays', () => {
    const input = [
        ['sleep', 'Backup', 'Writing snapshot', 'block', 1000, 100],
        ['sleep', 'Desktop', 'Preparing to sleep', 'delay', 1000, 101],
        ['idle', 'Screen locker', 'Keep screen awake', 'block', 1000, 102],
        ['shutdown', 'Updater', 'Finishing update', 'block', 1000, 103],
    ];
    assert.deepEqual(getSleepInhibitors(input), [
        {what: 'sleep', who: 'Backup', why: 'Writing snapshot', mode: 'block'},
        {what: 'sleep', who: 'Desktop', why: 'Preparing to sleep', mode: 'delay'},
    ]);
});

test('handles malformed inhibitor data without throwing', () => {
    assert.deepEqual(getSleepInhibitors(null), []);
    assert.deepEqual(getSleepInhibitors([null, ['idle', 'x', 'y', 'block', 1, 2]]), []);
});

import {buildSwitchUserActions} from '../lib/switch-users.js';

test('only offers switch actions for other users on local graphical sessions', () => {
    const sessions = [
        {id: '4', user: 'alice', seat: 'seat0', type: 'wayland', class: 'user', remote: false},
        {id: '5', user: 'bob', seat: 'seat0', type: 'x11', class: 'user', remote: false},
        {id: '6', user: 'me', seat: 'seat0', type: 'wayland', class: 'user', remote: false},
        {id: '7', user: 'ttyuser', seat: 'seat0', type: 'tty', class: 'user', remote: false},
        {id: '8', user: 'remote', seat: '', type: 'wayland', class: 'user', remote: true},
        {id: '9', user: 'greeter', seat: 'seat0', type: 'wayland', class: 'greeter', remote: false},
    ];
    assert.deepEqual(buildSwitchUserActions(sessions, 'me', '3'), [
        {id: 'switch-user-4', label: 'Switch to alice', icon: 'system-users-symbolic', cmd: ['loginctl', 'activate', '4'], destructive: false},
        {id: 'switch-user-5', label: 'Switch to bob', icon: 'system-users-symbolic', cmd: ['loginctl', 'activate', '5'], destructive: false},
    ]);
});

test('does not create switch actions for malformed session IDs', () => {
    assert.deepEqual(buildSwitchUserActions([
        {id: '../bad', user: 'other', seat: 'seat0', type: 'wayland', class: 'user', remote: false},
    ], 'me', '1'), []);
});
