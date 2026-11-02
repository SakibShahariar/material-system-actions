// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {selectInitialFocusWidget} from '../lib/focus-preferences.js';

test('prefers the configured visible and focusable action', () => {
    const lock = {_saActionId: 'lock', visible: true, can_focus: true};
    const suspend = {_saActionId: 'suspend', visible: true, can_focus: true};
    assert.equal(selectInitialFocusWidget([lock, suspend], 'suspend'), suspend);
});

test('falls back to the first visible action when the preferred action is hidden or unavailable', () => {
    const lock = {_saActionId: 'lock', visible: true, can_focus: true};
    const hiddenSuspend = {_saActionId: 'suspend', visible: false, can_focus: true};
    const unfocusableReboot = {_saActionId: 'reboot', visible: true, can_focus: false};
    assert.equal(selectInitialFocusWidget([hiddenSuspend, lock], 'suspend'), lock);
    assert.equal(selectInitialFocusWidget([unfocusableReboot, lock], 'reboot'), lock);
    assert.equal(selectInitialFocusWidget([lock], 'hibernate'), lock);
});

test('automatic focus and empty widget lists remain safe', () => {
    const first = {_saActionId: 'lock'};
    const second = {_saActionId: 'suspend'};
    assert.equal(selectInitialFocusWidget([first, second], 'auto'), first);
    assert.equal(selectInitialFocusWidget([], 'suspend'), null);
    assert.equal(selectInitialFocusWidget(null, 'suspend'), null);
});
