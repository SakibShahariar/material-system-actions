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
