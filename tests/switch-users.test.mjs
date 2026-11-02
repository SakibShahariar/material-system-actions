// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSwitchUserActions} from '../lib/switch-users.js';

const session = (id, user, seat = 'seat0', type = 'wayland') => ({
    id, user, seat, type, class: 'user', remote: false,
});

test('keeps concise labels when each user has one graphical session', () => {
    const actions = buildSwitchUserActions([
        session('4', 'alice'),
        session('5', 'bob', 'seat1', 'x11'),
    ], 'me', '3');
    assert.deepEqual(actions.map(action => action.label), [
        'Switch to alice',
        'Switch to bob',
    ]);
});

test('uses session type and seat only when duplicate usernames need disambiguation', () => {
    const actions = buildSwitchUserActions([
        session('4', 'alice', 'seat0', 'wayland'),
        session('5', 'alice', 'seat0', 'x11'),
        session('6', 'bob', 'seat0', 'wayland'),
        session('7', 'carol', 'seat1', 'wayland'),
        session('8', 'carol', 'seat2', 'wayland'),
    ], 'me', '3');
    assert.deepEqual(actions.map(action => action.label), [
        'Switch to alice (Wayland)',
        'Switch to alice (X11)',
        'Switch to bob',
        'Switch to carol (on seat1)',
        'Switch to carol (on seat2)',
    ]);
});

test('uses session IDs only when duplicate sessions share both seat and type', () => {
    const actions = buildSwitchUserActions([
        session('4', 'alice'),
        session('5', 'alice'),
        session('6', 'bob'),
    ], 'me', '3');
    assert.deepEqual(actions.map(action => action.label), [
        'Switch to alice (session 4)',
        'Switch to alice (session 5)',
        'Switch to bob',
    ]);
});
