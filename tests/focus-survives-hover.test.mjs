// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../stylesheet.css', import.meta.url), 'utf8');

test('focused buttons keep their outline while hovered', () => {
    // The plain :hover rule clears the outline. Compound :focus:hover
    // selectors must exist with higher specificity so the ring survives.
    assert.match(css, /\.sa-pill-btn:focus:hover/);
    assert.match(css, /\.sa-circle-btn:focus:hover/);
    assert.match(css, /\.sa-circle-btn\.sa-focus-ring:hover/);
    assert.match(css, /\.sa-pill-btn\.sa-tier-error:focus:hover/);

    const compound = css.match(/\.sa-pill-btn:focus:hover[\s\S]*?\n\}/);
    assert.ok(compound);
    assert.match(compound[0], /outline-style: solid/);
    assert.match(compound[0], /outline-width: 3px/);
    assert.match(compound[0], /outline-color: var\(--on_surface/);
});

test('spread box-shadows never reappear', () => {
    assert.doesNotMatch(css, /box-shadow:\s*0\s+0\s+0\s+\d+px/);
});
