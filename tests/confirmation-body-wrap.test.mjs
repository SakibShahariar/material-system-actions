// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmation buttons use compact sizing', () => {
    const source = read('../lib/confirmation-overlay.js');
    assert.match(source, /style_class: 'sa-pill-btn sa-confirm-btn'/);
    assert.match(source, /style_class: `\$\{confirmStyleClass\} sa-confirm-btn`/);
    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-panel \.sa-confirm-btn \{ min-height: 34px; padding: 6px 16px; \}/);
});

test('confirmation body text wraps inside the panel', () => {
    const source = read('../lib/confirmation-overlay.js');
    assert.match(source, /style_class: 'sa-muted sa-confirm-body'/);
    assert.match(source, /bodyLabel\.clutter_text\.line_wrap = true/);
    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-confirm-body \{ max-width: 420px; \}/);
});
