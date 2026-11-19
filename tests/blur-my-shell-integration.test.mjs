// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = relative => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('dialog opts its surfaces into Blur my Shell per-surface blur', () => {
    const source = read('../lib/dialog.js');
    assert.match(source, /this\._style\.bmsBlurTargets \?\? \[this\._styleRoot\]/);
    assert.match(source, /add_style_class_name\('bms-popup-blur-target'\)/);
    assert.match(source, /add_style_class_name\('bms-redraw-blur-instant'\)/);
});

test('card exposes its inner panel as the blur target', () => {
    const source = read('../lib/layouts/card.js');
    assert.match(source, /frame\.set_child\(box\)/);
    assert.match(source, /this\.bmsBlurTargets = \[box\]/);
});

test('confirmation sheets opt into blur independently', () => {
    const source = read('../lib/layouts/base.js');
    assert.match(source, /component\.root\.add_style_class_name\('bms-popup-blur-target'\)/);
    assert.match(source, /component\.root\.add_style_class_name\('bms-redraw-blur-instant'\)/);
});

test('README documents the optional Blur my Shell integration', () => {
    const readme = read('../README.md');
    assert.match(readme, /## Blur my Shell integration/);
    assert.match(readme, /bms-popup-blur-target/);
    assert.match(readme, /bms-redraw-blur-instant/);
    assert.match(readme, /inert when Blur my Shell is not installed/);
});
