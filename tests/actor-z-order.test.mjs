// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {raiseActorAboveSiblings} from '../lib/actor-z-order.js';

test('legacy Shell actors are raised with raise_top()', () => {
    let raiseCalls = 0;
    let parentCalls = 0;
    const actor = {
        raise_top: () => { raiseCalls++; },
        get_parent: () => {
            parentCalls++;
            return {set_child_above_sibling: () => {}};
        },
    };

    assert.equal(raiseActorAboveSiblings(actor), true);
    assert.equal(raiseCalls, 1);
    assert.equal(parentCalls, 0);
});

test('newer Shell actors are raised above their siblings', () => {
    const calls = [];
    const parent = {
        set_child_above_sibling: (child, sibling) => calls.push([child, sibling]),
    };
    const actor = {get_parent: () => parent};

    assert.equal(raiseActorAboveSiblings(actor), true);
    assert.deepEqual(calls, [[actor, null]]);
});

test('an actor without either z-order API is ignored without throwing', () => {
    assert.equal(raiseActorAboveSiblings({get_parent: () => null}), false);
    assert.equal(raiseActorAboveSiblings({}), false);
    assert.equal(raiseActorAboveSiblings(null), false);
    assert.equal(raiseActorAboveSiblings(undefined), false);
});

test('a destroyed actor cannot abort the confirmation lifecycle', () => {
    const actor = {
        get_parent: () => { throw new Error('actor was finalized'); },
    };

    assert.equal(raiseActorAboveSiblings(actor), false);
});
