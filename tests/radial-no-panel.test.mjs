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
