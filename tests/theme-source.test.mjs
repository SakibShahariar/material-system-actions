// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('theme resolver exposes candidate paths and the effective source', () => {
    const theme = read('../lib/theme.js');
    assert.match(theme, /export function getThemeSourcePaths\(\)/);
    assert.match(theme, /export function getThemeSource\(\)/);
    assert.match(theme, /\.find\(candidate => Gio\.File\.new_for_path\(candidate\)\.query_exists\(null\)\) \?\? null/);
    assert.match(theme, /const path = getThemeSource\(\);/);
    assert.doesNotMatch(theme, /const path = themeFilePaths\(\)/);
});

test('Preferences shows the effective theme source and monitors changes', () => {
    const prefs = read('../prefs.js');
    assert.match(prefs, /import \{getThemeSource, getThemeSourcePaths\} from '\.\/lib\/theme\.js';/);
    assert.match(prefs, /title: 'Theme source'/);
    assert.match(prefs, /subtitle: getThemeSource\(\) \?\? 'Fallback theme'/);
    assert.match(prefs, /themeSourceRow\.subtitle = getThemeSource\(\) \?\? 'Fallback theme'/);
    assert.match(prefs, /getThemeSourcePaths\(\)/);
    assert.match(prefs, /monitor\(Gio\.FileMonitorFlags\.NONE, null\)/);
    assert.match(prefs, /monitor\.connect\('changed', refreshThemeSource\)/);
    assert.match(prefs, /this\._themeMonitors = \[\]/);
});
