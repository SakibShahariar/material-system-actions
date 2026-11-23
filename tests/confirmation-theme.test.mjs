// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('confirmation sheets keep the theme surface while using BMS blur', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /createConfirmationOverlay\(\{/);
    assert.match(base, /component\.root\.add_style_class_name\('bms-popup-blur-target'\)/);
    assert.match(base, /component\.root\.add_style_class_name\('bms-redraw-blur-instant'\)/);

    const css = read('../stylesheet.css');
    assert.match(css, /\.bms-popup-blur-target\.sa-panel \{/);
    assert.match(css, /background-color: var\(--sa-panel-surface, var\(--surface_container_low/);
    assert.match(css, /border-color: var\(--outline_variant/);
});

test('confirmation and panel surfaces share the panel-opacity transparency', () => {
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /--sa-panel-surface: \$\{bg\}/);
    assert.match(dialog, /this\._style\?\._confirmation\?\.root/);
    assert.match(dialog, /\.\.\.\(this\._style\?\.bmsBlurTargets \?\? \[\]\)/);

    const base = read('../lib/layouts/base.js');
    assert.match(base, /root: component\.root,/);
    assert.match(base, /this\.dialog\._applyPanelOpacity\?\.\(\);/);
});

test('confirmation reuses the existing BMS blur target so its surface is not lost', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /const carrier = this\.bmsBlurTargets\?\.\[0\] \?\? this\.dialog\._styleRoot/);
    assert.match(base, /if \(carrier && this\.transparentRoot\)/);
    assert.match(base, /\(carrier \?\? overlay\)\.add_child\(component\.root\)/);
    assert.match(base, /for \(const child of carrier\.get_children\(\)\)/);
    assert.match(base, /if \(child\.visible\) \{[\s\S]*?hiddenChildren\.push\(child\)/);
    assert.match(base, /for \(const child of hiddenChildren\) child\.show\(\)/);
    assert.match(base, /previousCarrierStyle/);
    assert.match(base, /carrier\.set_style\?\.\(style\.replace\(\/border-radius:\\s\*999px\/, 'border-radius: 20px'\)\)/);
});
