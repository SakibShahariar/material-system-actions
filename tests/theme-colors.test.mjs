// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {hexToRgba, normalizeHexColor, parseCssColors} from '../lib/theme-colors.js';

test('normalizes three-digit hex colors and preserves six- and eight-digit colors', () => {
    assert.equal(normalizeHexColor('#abc'), '#aabbcc');
    assert.equal(normalizeHexColor('ABC'), '#AABBCC');
    assert.equal(normalizeHexColor('#112233'), '#112233');
    assert.equal(normalizeHexColor('#11223380'), '#11223380');
});

test('rejects malformed and unsupported hex colors', () => {
    for (const value of ['#12', '#12345', '#ggg', '#1122334455', 'red', null, 123])
        assert.equal(normalizeHexColor(value), null);
});

test('parses CSS roles with three-, six-, and eight-digit hex values', () => {
    assert.deepEqual(parseCssColors([
        ':root {',
        '  --primary: #abc;',
        '  --secondary: #112233;',
        '  --tertiary: #11223380;',
        '  --invalid-short: #12;',
        '  --invalid-alpha: #1122334455;',
        '  --invalid-name: #ggg;',
        '}',
    ].join('\n')), {
        primary: '#aabbcc',
        secondary: '#112233',
        tertiary: '#11223380',
    });
});

test('converts short hex colors to RGBA', () => {
    assert.equal(hexToRgba('#abc', 0.25), 'rgba(170,187,204,0.25)');
});

test('combines embedded eight-digit alpha with requested glow opacity', () => {
    const expectedAlpha = (128 / 255) * 0.5;
    assert.equal(
        hexToRgba('#11223380', 0.5),
        `rgba(17,34,51,${expectedAlpha})`,
    );
});

test('keeps fully opaque CSS hex values and handles zero opacity', () => {
    assert.equal(hexToRgba('#11223380', 1), '#11223380');
    assert.equal(hexToRgba('#112233', 0), 'transparent');
    assert.equal(hexToRgba('not-a-color', 0.5), 'not-a-color');
});
