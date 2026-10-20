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
