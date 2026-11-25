// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmations are centered even for edge-positioned layouts', () => {
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /const pos = this\._style\?\._confirmation \? 'center' : this\._style\?\.position/);
    assert.match(dialog, /if \(!pos\) return;/);
});

test('the exact pre-confirmation position is cached and restored on cancel', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /const originalPos = this\.dialog\.dialogLayout\?\.get_position\?\.\(\) \?\? null/);
    assert.match(base, /this\.dialog\.dialogLayout\.set_position\(originalPos\.x, originalPos\.y\)/);
    // Must not re-measure via _applyPosition during cleanup.
    assert.doesNotMatch(base, /if \(!this\._confirmation\) this\.dialog\._applyPosition/);
});
