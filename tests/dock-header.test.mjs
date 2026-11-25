// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('dock header is compact: smaller clock and tighter spacing', () => {
    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-layout-dock \{ spacing: 8px; padding: 10px 8px; \}/);
    assert.match(css, /\.sa-layout-dock \.sa-shared-status-header \{ spacing: 1px; padding: 2px 4px 4px; \}/);
    assert.match(css, /\.sa-layout-dock \.sa-status-clock \{ font-size: 0\.95em; \}/);

    const dock = read('../lib/layouts/dock.js');
    assert.match(dock, /spacing: 8px; padding: 10px 8px; min-width: 64px/);
});
