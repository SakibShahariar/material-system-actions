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
    // The old -2px translation hack shifted row labels away from the border.
    assert.doesNotMatch(source, /set_translation\(-2/);
    assert.match(source, /style: 'padding: 0; margin: 0; border: 0;'/);
    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-tui-row \{[^}]*margin: 0; padding: 0;/);
    assert.match(css, /\.sa-tui-row StLabel \{ margin: 0; padding: 0; text-align: left; \}/);
});
