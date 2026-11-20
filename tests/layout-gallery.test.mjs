// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAYOUT_METADATA} from '../lib/layouts/metadata.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('preferences renders a gallery card for every registered layout', () => {
    const prefs = read('../prefs.js');
    assert.match(prefs, /title: 'Layout gallery'/);
    assert.match(prefs, /new Gtk\.FlowBox\(/);
    assert.match(prefs, /min_children_per_line: 2/);
    assert.match(prefs, /max_children_per_line: 3/);
    assert.match(prefs, /max_width_chars: 26/);
    assert.match(prefs, /for \(const id of STYLE_NAMES\)/);
    assert.match(prefs, /metadata\.displayName/);
    assert.match(prefs, /metadata\.description/);
    assert.match(prefs, /icon_name: 'applications-graphics-symbolic'/);
    assert.match(prefs, /cardPreview\.connect\('clicked', \(\) => previewLayout\(id\)\)/);
    assert.match(prefs, /cardApply\.connect\('clicked', \(\) => settings\.set_string\('style', id\)\)/);
    assert.equal(Object.keys(LAYOUT_METADATA).length, 15);
});

test('the redundant preview-selected row is gone and the combo applies directly', () => {
    const prefs = read('../prefs.js');
    assert.doesNotMatch(prefs, /Preview selected layout/);
    assert.doesNotMatch(prefs, /updateStyleApplyState/);
    assert.match(prefs, /styleRow\.connect\('notify::selected'/);
    assert.match(prefs, /settings\.set_string\('style', id\)/);
});

test('gallery apply updates the saved style through the shared setting', () => {
    const prefs = read('../prefs.js');
    assert.match(prefs, /settings\.connect\('changed::style'/);
    assert.match(prefs, /const previewLayout = \(id, onError = null\)/);
});
