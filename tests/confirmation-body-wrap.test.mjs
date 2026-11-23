// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmation buttons have an explicit compact height', () => {
    const source = read('../lib/confirmation-overlay.js');
    assert.match(source, /style_class: 'sa-pill-btn sa-confirm-btn'/);
    assert.match(source, /style_class: `\$\{confirmStyleClass\} sa-confirm-btn`/);
    assert.match(source, /const compactStyle = 'height: 38px; min-height: 38px; padding: 4px 18px;'/);
    assert.equal((source.match(/style: compactStyle/g) ?? []).length, 2);
    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-confirm-btn \{[\s\S]*?height: 38px !important/);
    assert.match(css, /\.sa-confirm-btn \{[\s\S]*?padding: 4px 18px !important/);
});

test('confirmation body text wraps inside the panel', () => {
    const source = read('../lib/confirmation-overlay.js');
    assert.match(source, /style_class: 'sa-muted sa-confirm-body'/);
    assert.match(source, /bodyLabel\.clutter_text\.line_wrap = true/);
    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-confirm-body \{ max-width: 420px; \}/);
});
