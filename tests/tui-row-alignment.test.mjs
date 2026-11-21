// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('TUI keyless rows align with letter-shortcut rows', () => {
    const source = read('../lib/layouts/tui.js');
    assert.match(source, /const shortcut = key \? `\[\$\{key\}\] ` : '    ';/);
    assert.doesNotMatch(source, /: '      ';/);
});

test('TUI row buttons do not shift the box-drawing borders', () => {
    const source = read('../lib/layouts/tui.js');
    assert.match(source, /label\.set_translation\(-2, 0\)/);
    assert.match(source, /style: 'padding: 0; margin: 0; border: 0;'/);
    assert.match(read('../stylesheet.css'), /\.sa-tui-row \{[^}]*margin: 0; padding: 0;/);
});
