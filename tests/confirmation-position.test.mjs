// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmations are centered even for edge-positioned layouts', () => {
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /const pos = this\._style\?\._confirmation \? 'center' : \(this\._style\?\.position \?\? 'center'\)/);
    assert.doesNotMatch(dialog, /if \(!pos\) return;/);
});

test('layout root is hidden whole and position is reapplied on cancel', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /if \(previousChild\) previousChild\.hide\(\)/);
    assert.match(base, /if \(previousChild\) previousChild\.show\(\)/);
    assert.match(base, /this\.dialog\._applyPosition\?\.\(\);/);
    assert.doesNotMatch(base, /hiddenChildren/);
    assert.doesNotMatch(base, /originalPos/);
});
