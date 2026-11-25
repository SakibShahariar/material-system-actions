// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmations are centered even for edge-positioned layouts', () => {
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /const pos = this\._style\?\._confirmation \? 'center' : this\._style\?\.position/);
    assert.doesNotMatch(dialog, /const pos[\s\S]{0,120}if \(!pos\) return;/);
});

test('dialog position is restored when the confirmation closes', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /\} else if \(previousChild\) \{\n\s+previousChild\.show\(\);\n\s+\}\n\s+\/\/ Confirmation is gone/);
    assert.match(base, /this\.dialog\._applyPosition\?\.\(\);/);
    assert.match(base, /overlay\.queue_relayout\(\);/);
    assert.match(base, /if \(!this\._confirmation\) this\.dialog\._applyPosition\?\.\(\);/);
});
