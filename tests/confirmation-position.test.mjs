// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('positioning uses native centering for centered layouts', () => {
    const dialog = read('../lib/dialog.js');
    const fn = dialog.match(/_applyPosition\(\) \{[\s\S]*?\n        \}/);
    assert.ok(fn, '_applyPosition exists');
    const body = fn[0];
    assert.match(body, /const layoutPos = this\._style\?\.position/);
    assert.match(body, /const pos = this\._style\?\._confirmation && layoutPos \? 'center' : layoutPos/);
    // No explicit position for centered layouts — native x_align/y_align wins.
    assert.match(body, /if \(!pos\) return;/);
    assert.doesNotMatch(body, /set_position\(0,\s*0\)/);
});

test('layout root is hidden whole and position reapplied on cancel', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /if \(previousChild\) previousChild\.hide\(\)/);
    assert.match(base, /if \(previousChild\) previousChild\.show\(\)/);
    assert.match(base, /this\.dialog\._applyPosition\?\.\(\);/);
    assert.doesNotMatch(base, /hiddenChildren/);
    assert.doesNotMatch(base, /originalPos/);
});

test('confirmation is added directly to contentLayout, not nested in the layout', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /overlay\.add_child\(component\.root\)/);
    assert.doesNotMatch(base, /\(carrier \?\? overlay\)\.add_child/);
});
