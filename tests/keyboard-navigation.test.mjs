// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {handleKeyboardNavigation} from '../lib/keyboard-navigation.js';

const keys = {
    escape: 1, enter: 2, keypadEnter: 3, space: 4, tab: 5, isoLeftTab: 6,
    left: 7, right: 8, up: 9, down: 10, h: 11, k: 12, l: 13, j: 14,
    one: 20, nine: 28, keypadOne: 30, keypadNine: 38,
};
const stop = Symbol('stop');
const propagate = Symbol('propagate');
const makeEvent = sym => ({get_key_symbol: () => sym});
const makeContext = overrides => {
    const state = {
        style: {
            _keyMap: {},
            _navWidgets: [],
            _focusedIdx: 0,
            trigger() {},
            moveNav() { return false; },
            onKeyPress() { return false; },
        },
        actions: {all: []},
        keys,
        keysymToUnicode: () => 0,
        eventStop: stop,
        eventPropagate: propagate,
        getKeyFocus: () => null,
        closeDialog() {},
        ...overrides,
    };
    return state;
};

test('layout confirmation handler gets first refusal', () => {
    let called = false;
    const context = makeContext({
        style: {handleDialogKeyPress: () => { called = true; return true; }},
    });
    assert.equal(handleKeyboardNavigation(makeEvent(keys.escape), context), stop);
    assert.equal(called, true);
});

test('confirmation mode only moves between buttons and activates the focused button', () => {
    const events = [];
    let focused = null;
    const cancel = {
        grab_key_focus: () => { events.push('cancel-focus'); focused = cancel; },
        emit: signal => events.push('cancel-' + signal),
    };
    const confirm = {
        grab_key_focus: () => { events.push('confirm-focus'); focused = confirm; },
        emit: signal => events.push('confirm-' + signal),
    };
    focused = cancel;
    const context = makeContext({
        style: {
            _confirmation: {cancelBtn: cancel, confirmBtn: confirm},
            _keyMap: {l: {id: 'lock'}},
            pressFlash: widget => events.push(widget === confirm ? 'confirm-flash' : 'cancel-flash'),
            trigger: () => events.push('trigger'),
        },
        getKeyFocus: () => focused,
    });
    assert.equal(handleKeyboardNavigation(makeEvent(keys.tab), context), stop);
    assert.deepEqual(events, ['confirm-focus']);
    events.length = 0;
    assert.equal(handleKeyboardNavigation(makeEvent(keys.enter), context), stop);
    assert.deepEqual(events, ['confirm-focus', 'confirm-flash', 'confirm-clicked']);
    assert.equal(handleKeyboardNavigation(makeEvent(keys.escape), context), stop);
    assert.deepEqual(events, ['flash', 'clicked']);
});

test('Escape closes the dialog outside confirmation mode', () => {
    let closed = false;
    const context = makeContext({closeDialog: () => { closed = true; }});
    assert.equal(handleKeyboardNavigation(makeEvent(keys.escape), context), stop);
    assert.equal(closed, true);
});

test('letter action hotkeys take priority over layout navigation', () => {
    const events = [];
    const action = {id: 'lock'};
    const context = makeContext({
        style: {
            _keyMap: {l: action},
            trigger: value => events.push(value.id),
            onKeyPress: () => { events.push('layout'); return true; },
            moveNav: () => { events.push('move'); return true; },
        },
        keysymToUnicode: () => 'l'.charCodeAt(0),
    });
    assert.equal(handleKeyboardNavigation(makeEvent(keys.l), context), stop);
    assert.deepEqual(events, ['lock']);
});

test('layout-specific handlers run before generic directional navigation', () => {
    const events = [];
    const context = makeContext({
        style: {
            _keyMap: {},
            onKeyPress: () => { events.push('layout'); return true; },
            moveNav: () => { events.push('move'); return true; },
        },
    });
    assert.equal(handleKeyboardNavigation(makeEvent(keys.left), context), stop);
    assert.deepEqual(events, ['layout']);
});

test('directional and hjkl keys move navigation in the expected direction', () => {
    for (const sym of [keys.left, keys.up, keys.h, keys.k, keys.isoLeftTab]) {
        let delta = 0;
        const context = makeContext({style: {moveNav: value => { delta = value; return true; }}});
        assert.equal(handleKeyboardNavigation(makeEvent(sym), context), stop);
        assert.equal(delta, -1);
    }
    for (const sym of [keys.right, keys.down, keys.l, keys.j, keys.tab]) {
        let delta = 0;
        const context = makeContext({style: {moveNav: value => { delta = value; return true; }}});
        assert.equal(handleKeyboardNavigation(makeEvent(sym), context), stop);
        assert.equal(delta, 1);
    }
});

test('Enter activates the focused widget or falls back to the selected navigation index', () => {
    const events = [];
    const focused = {emit: signal => events.push('focused-' + signal)};
    const context = makeContext({
        style: {
            _focusedIdx: 0,
            _navWidgets: [{emit: signal => events.push('fallback-' + signal)}],
            pressFlash: widget => events.push(widget === focused ? 'focused-flash' : 'fallback-flash'),
        },
        getKeyFocus: () => focused,
    });
    assert.equal(handleKeyboardNavigation(makeEvent(keys.enter), context), stop);
    assert.deepEqual(events, ['focused-flash', 'focused-clicked']);

    events.length = 0;
    context.getKeyFocus = () => null;
    assert.equal(handleKeyboardNavigation(makeEvent(keys.space), context), stop);
    assert.deepEqual(events, ['fallback-flash', 'fallback-clicked']);
});

test('main and keypad digits activate actions in the current visible order', () => {
    const events = [];
    const actions = Array.from({length: 9}, (_, index) => ({id: 'action-' + index}));
    const context = makeContext({
        actions: {all: actions},
        style: {trigger: action => events.push(action.id)},
    });
    assert.equal(handleKeyboardNavigation(makeEvent(keys.one + 2), context), stop);
    assert.equal(handleKeyboardNavigation(makeEvent(keys.keypadOne + 4), context), stop);
    assert.deepEqual(events, ['action-2', 'action-4']);
    assert.equal(handleKeyboardNavigation(makeEvent(keys.nine), context), stop);
    assert.deepEqual(events, ['action-2', 'action-4', 'action-8']);
});

test('unknown keys propagate to GNOME Shell', () => {
    const context = makeContext();
    assert.equal(handleKeyboardNavigation(makeEvent(999), context), propagate);
});
