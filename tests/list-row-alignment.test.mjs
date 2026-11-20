// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('list rows reserve a badge slot for keyless actions', () => {
    const list = read('../lib/layouts/list.js');
    assert.match(list, /text: action\.key \? action\.key\.toUpperCase\(\) : ' '/);
    assert.match(list, /sa-rofi-key-blank/);
    assert.doesNotMatch(list, /if \(action\.key\) \{/);
    assert.match(read('../stylesheet.css'), /\.sa-rofi-key-blank/);
});
