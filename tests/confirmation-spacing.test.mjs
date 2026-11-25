// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmation layout has roomier spacing', () => {
    const overlay = read('../lib/confirmation-overlay.js');
    assert.match(overlay, /rootStyle = 'spacing: 16px; min-width: 360px; padding: 26px;'/);
    assert.match(overlay, /style: 'spacing: 14px; margin-top: 6px;'/);
    assert.match(overlay, /height: 38px; min-height: 38px; padding: 4px 22px;/);

    const base = read('../lib/layouts/base.js');
    assert.match(base, /min-width: 360px; max-width: 500px; padding: 26px;/);
});

test('focus darkens on_primary for contrast against the translucent tint', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /const focusBg = hexToRgba\(this\.theme\?\.primary \|\| '#b0c6ff', 0\.6\)/);
    assert.match(base, /const focusFg = darkenHex\(this\.theme\?\.on_primary \|\| '#561d27', 0\.3\)/);
    assert.doesNotMatch(base, /const focusFg = this\.theme\?\.on_surface/);
    assert.doesNotMatch(base, /const focusFg = this\.theme\?\.primary_fixed/);
});
