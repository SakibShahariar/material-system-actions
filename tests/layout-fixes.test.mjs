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
    assert.match(grid, /const perRow = 6;/);
    assert.match(grid, /new St\.Bin\(\{x_expand: true\}\)[\s\S]*?rowWrap\.set_child\(row\)/);
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

test('halo ring, dock icons, and banner actions are centered', () => {
    const halo = read('../lib/layouts/halo.js');
    const dock = read('../lib/layouts/dock.js');
    const banner = read('../lib/layouts/banner.js');
    assert.match(halo, /new St\.Bin\(\{x_expand: true\}\)[\s\S]*?ringBox\.set_child\(fixed\)/);
    assert.match(halo, /x_align: Clutter\.ActorAlign\.CENTER,\s*layout_manager: new Clutter\.FixedLayout/);
    assert.match(halo, /outer\.add_child\(ringBox\)/);
    assert.match(dock, /min-width: 64px; x-align: center/);
    assert.equal((dock.match(/x_align: Clutter\.ActorAlign\.CENTER/g) ?? []).length, 2);
    assert.match(banner, /new St\.Bin\(\{x_expand: true\}\)[\s\S]*?rowWrap\.set_child\(row\)/);
    for (const file of ['halo', 'banner', 'capsule', 'avatar']) {
        const source = read(`../lib/layouts/${file}.js`);
        assert.doesNotMatch(source, /x_fill/, `${file} must not use removed x_fill`);
    }
});

test('account avatar PNG is cropped circular and cached', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /import GdkPixbuf from 'gi:\/\/GdkPixbuf'/);
    assert.match(base, /import Gdk from 'gi:\/\/Gdk\?version=4\.0'/);
    assert.match(base, /import cairo from 'gi:\/\/cairo'/);
    assert.match(base, /_circularAvatarPath\(path, size\)/);
    assert.match(base, /context\.arc\(size \/ 2, size \/ 2, size \/ 2/);
    assert.match(base, /context\.clip\(\)/);
    assert.match(base, /surface\.writeToPNG\(output\)/);
    assert.match(base, /Gio\.File\.new_for_path\(this\._circularAvatarPath\(path, size\)\)/);
});

test('avatars are clipped to a circle everywhere', () => {
    const css = read('../stylesheet.css');
    assert.match(css, /\.sa-avatar \{\s*border-radius: 999px;\s*overflow: hidden;/);
    assert.match(css, /\.sa-avatar-image \{ overflow: hidden; \}/);
    assert.doesNotMatch(css, /\.sa-layout-card \.sa-avatar \{[^}]*border-radius: 12px/);
});

test('capsule tile labels are centered under their icons', () => {
    const capsule = read('../lib/layouts/capsule.js');
    assert.match(capsule, /font-size: 0\.8em;', x_align: Clutter\.ActorAlign\.CENTER, y_align: Clutter\.ActorAlign\.CENTER/);
    assert.match(capsule, /new St\.Bin\(\{x_expand: true\}\)[\s\S]*?rowWrap\.set_child\(row\)/);
    assert.match(capsule, /sa-row-icon-badge[\s\S]*?x_align: Clutter\.ActorAlign\.CENTER,\s*y_align: Clutter\.ActorAlign\.CENTER/);
    assert.match(capsule, /badge\.set_child\(this\.makeIcon\(action\.icon, 16\)\)/);
    const avatar = read('../lib/layouts/avatar.js');
    assert.match(avatar, /new St\.Bin\(\{x_expand: true\}\)[\s\S]*?contentWrap\.set_child\(content\)/);
});

test('banner wallpaper covers the banner by center-cropping', () => {
    const banner = read('../lib/layouts/banner.js');
    assert.match(banner, /load_file_async\(\s*file, bannerWidth, -1, paintScale, 1\)/);
    assert.match(banner, /bannerContent\.set_clip\(0, 0, bannerWidth, bannerHeight\)/);
});
