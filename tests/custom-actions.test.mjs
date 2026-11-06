// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCustomActions} from '../lib/custom-actions.js';

const validAction = overrides => ({
    id: 'custom-example',
    label: ' Example action ',
    icon: 'utilities-terminal-symbolic',
    cmd: ['/usr/bin/true'],
    ...overrides,
});

test('empty or missing configuration produces no custom actions', () => {
    assert.deepEqual(parseCustomActions(''), []);
    assert.deepEqual(parseCustomActions(null), []);
    assert.deepEqual(parseCustomActions('[]'), []);
});

test('valid actions are normalized and default to confirmation', () => {
    const actions = parseCustomActions(JSON.stringify([validAction()]));
    assert.deepEqual(actions, [{
        id: 'custom-example',
        label: 'Example action',
        icon: 'utilities-terminal-symbolic',
        cmd: ['/usr/bin/true'],
        destructive: true,
        key: null,
        custom: true,
    }]);
});

test('explicit confirmation and a free shortcut are preserved', () => {
    const actions = parseCustomActions(JSON.stringify([
        validAction({confirm: false, key: 'x'}),
    ]));
    assert.equal(actions[0].destructive, false);
    assert.equal(actions[0].key, 'x');
});

test('configuration must be valid JSON containing an array', () => {
    assert.throws(() => parseCustomActions('{'), /valid JSON/);
    assert.throws(() => parseCustomActions('{}'), /JSON array/);
});

test('custom IDs cannot collide with built-ins or use unsupported syntax', () => {
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({id: 'lock'}),
    ])), /collides with a built-in action/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({id: 'Custom-example'}),
    ])), /id must start with "custom-"/);
});

test('duplicate IDs are rejected', () => {
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction(),
        validAction(),
    ])), /duplicate id/);
});

test('labels, icons, and argv entries are bounded and validated', () => {
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({label: '   '}),
    ])), /label must contain/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({label: 'x'.repeat(49)}),
    ])), /label must contain/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({icon: 'not-an-icon'}),
    ])), /icon must be a symbolic icon name/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({cmd: []}),
    ])), /cmd must be a non-empty array/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({cmd: ['/usr/bin/true', 'x'.repeat(1025)]}),
    ])), /cmd must be a non-empty array/);
});

test('confirmation and shortcut values are validated and reserved keys cannot be reused', () => {
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({confirm: 'yes'}),
    ])), /confirm must be true or false/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({key: 'l'}),
    ])), /already reserved or used/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({key: 'X'}),
    ])), /key must be one lowercase letter/);
    assert.throws(() => parseCustomActions(JSON.stringify([
        validAction({key: 'x'}),
        validAction({id: 'custom-other', key: 'x'}),
    ])), /already reserved or used/);
});
