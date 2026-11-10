// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeStatusHeaderDensity} from '../lib/status-header.js';

test('uses comfortable density by default and for unknown values', () => {
    assert.equal(normalizeStatusHeaderDensity(''), 'comfortable');
    assert.equal(normalizeStatusHeaderDensity('unknown'), 'comfortable');
});

test('accepts compact and comfortable density values', () => {
    assert.equal(normalizeStatusHeaderDensity('compact'), 'compact');
    assert.equal(normalizeStatusHeaderDensity('comfortable'), 'comfortable');
});

test('Preferences imports the status-header helpers it uses', () => {
    const prefs = readFileSync(new URL('../prefs.js', import.meta.url), 'utf8');
    assert.match(
        prefs,
        /import \{STATUS_HEADER_DENSITIES, normalizeStatusHeaderDensity\} from '\.\/lib\/status-header\.js';/
    );
});
