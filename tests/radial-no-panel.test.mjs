// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('radial opts out of the rectangular panel background', () => {
    const radial = read('../lib/layouts/radial.js');
    assert.match(radial, /this\.transparentRoot = true/);
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /if \(!target \|\| this\._style\?\.transparentRoot\) return/);
});

test('stylesheet overrides blur providers forced modal background', () => {
    const css = read('../stylesheet.css');
    assert.match(css, /\.bms-popup-surface-dark \.modal-dialog\.system-actions-dialog/);
    assert.match(css, /background-color: transparent !important/);
    assert.match(css, /\.bms-popup-blur-target\.sa-layout-radial/);
});
