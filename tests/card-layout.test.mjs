// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('card action row expands to fill the fixed card width', () => {
    const css = read('../stylesheet.css');
    const card = read('../lib/layouts/card.js');
    const frameWidth = Number(css.match(/\.sa-card-frame \{[\s\S]*?width: (\d+)px;/)?.[1]);
    const minWidth = Number(css.match(/\.sa-layout-card \.sa-card-action \{[\s\S]*?min-width: (\d+)px;/)?.[1]);
    const rowSpacing = Number(css.match(/\.sa-layout-card \.sa-card-action-row \{ spacing: (\d+)px; \}/)?.[1]);

    assert.equal(frameWidth, 520);
    assert.ok(Number.isFinite(minWidth) && Number.isFinite(rowSpacing));
    assert.doesNotMatch(css, /\.sa-layout-card \.sa-card-action \{[^}]*max-width/);
    assert.match(card, /style_class: 'sa-card-action-row',\s*x_expand: true/);
    assert.match(card, /style_class: `sa-pill-btn sa-card-action sa-tier-\$\{tier\}`,\s*can_focus: true,\s*x_expand: true/);

    // Even six actions at the minimum width must fit inside the card content.
    const rowWidth = 6 * minWidth + 5 * rowSpacing;
    assert.ok(rowWidth <= frameWidth - 40, `row width ${rowWidth} exceeds card content width`);
});
