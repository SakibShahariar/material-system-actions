// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('card action row fits inside the fixed card width', () => {
    const css = read('../stylesheet.css');
    const frameWidth = Number(css.match(/\.sa-card-frame \{[\s\S]*?width: (\d+)px;/)?.[1]);
    const actionWidth = Number(css.match(/\.sa-layout-card \.sa-card-action \{[\s\S]*?width: (\d+)px;/)?.[1]);
    const rowSpacing = Number(css.match(/\.sa-layout-card \.sa-card-action-row \{ spacing: (\d+)px; \}/)?.[1]);

    assert.equal(frameWidth, 520);
    assert.ok(Number.isFinite(actionWidth) && Number.isFinite(rowSpacing));

    // St.Button adds fixed horizontal padding/outline beyond the CSS width.
    // Four buttons plus three gaps must stay inside the card's content box.
    const buttonOverhead = 26;
    const rowWidth = 4 * (actionWidth + buttonOverhead) + 3 * rowSpacing;
    assert.ok(rowWidth <= frameWidth - 40, `row width ${rowWidth} exceeds card content width`);
});
