// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('grid tiles fit six actions inside the fixed grid width', () => {
    const grid = read('../lib/layouts/grid.js');
    const width = Number(grid.match(/width: (\d+)px; height: 96px/)?.[1]);
    assert.ok(Number.isFinite(width));
    const rowWidth = 6 * (width + 2) + 5; // CSS width + border, 1px seams
    assert.ok(rowWidth <= 480, `grid row ${rowWidth} exceeds the 480px panel`);
});

test('vertical dock is pinned left but vertically centered', () => {
    const dialog = read('../lib/dialog.js');
    assert.match(dialog, /case 'left-edge': x = monitor\.x \+ margin; break;/);
    assert.doesNotMatch(dialog, /case 'left-edge':[^\n]*y = monitor\.y \+ margin/);
});

test('every avatar-bearing layout uses the shared real-account avatar', () => {
    const base = read('../lib/layouts/base.js');
    const card = read('../lib/layouts/card.js');
    assert.match(base, /_buildAvatar\(size, extraStyle = ''\)/);
    assert.match(base, /AccountsService/);
    assert.doesNotMatch(card, /_buildAvatar\(size\) \{/);
    for (const layout of ['avatar', 'banner', 'capsule', 'pill', 'card']) {
        const source = read(`../lib/layouts/${layout}.js`);
        assert.match(source, /this\._buildAvatar\(/, `${layout} must use the shared avatar helper`);
    }
});

test('halo dots rely on stylesheet classes so hold progress is visible', () => {
    const halo = read('../lib/layouts/halo.js');
    const css = read('../stylesheet.css');
    assert.match(halo, /style_class: 'sa-dot', style: 'width: 8px; height: 8px; border-radius: 999px;'/);
    assert.doesNotMatch(halo, /sa-dot[^\n]*background-color/);
    assert.match(css, /\.sa-dot-filled \{ background-color: var\(--error/);
});

test('capsule destructive tiles are equal width and fit the panel', () => {
    const capsule = read('../lib/layouts/capsule.js');
    assert.match(capsule, /this\._tile\(a, 78, 80, 18, true\)/);
    assert.match(capsule, /min-width:\$\{w\}px; max-width:\$\{w\}px/);
    const rowWidth = 4 * 78 + 3 * 8;
    assert.ok(rowWidth <= 342, `destructive row ${rowWidth} exceeds the capsule content width`);
});

test('pill action row is centered with comfortable button spacing', () => {
    const pill = read('../lib/layouts/pill.js');
    assert.match(pill, /spacing: 12px;', x_align: Clutter\.ActorAlign\.CENTER/);
    assert.match(pill, /width: 44px; height: 44px; border-radius: 999px/);
    const rowWidth = 6 * 44 + 5 * 12;
    assert.ok(rowWidth <= 342, `pill row ${rowWidth} exceeds the panel content width`);
});

test('banner wallpaper covers the banner by center-cropping', () => {
    const banner = read('../lib/layouts/banner.js');
    assert.match(banner, /load_file_async\(\s*file, bannerWidth, -1, paintScale, 1\)/);
    assert.match(banner, /bannerContent\.set_clip\(0, 0, bannerWidth, bannerHeight\)/);
});
