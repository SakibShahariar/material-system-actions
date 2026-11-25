// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('TUI rows align with the box-drawing border without a translation hack', () => {
    const tui = read('../lib/layouts/tui.js');
    assert.doesNotMatch(tui, /set_translation\(-2/);

    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-layout-tui \{ padding: 14px !important; \}/);
    assert.match(css, /\.sa-tui-row > StLabel,\n\s*\.sa-tui-row StLabel \{ margin: 0; padding: 0; text-align: left; \}/);
});
