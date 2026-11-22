// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLOCK_FORMATS, DEFAULT_CLOCK_FORMAT, normalizeClockFormat, getClockFormat, formatClock} from '../lib/clock-format.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const dateTime = pattern => ({format: p => (p === pattern ? 'FORMATTED' : `unexpected:${p}`)});

test('normalizeClockFormat accepts known values and falls back for anything else', () => {
    assert.deepEqual([...CLOCK_FORMATS], ['24h', '12h']);
    assert.equal(DEFAULT_CLOCK_FORMAT, '24h');
    assert.equal(normalizeClockFormat('24h'), '24h');
    assert.equal(normalizeClockFormat('12h'), '12h');
    assert.equal(normalizeClockFormat('bogus'), '24h');
    assert.equal(normalizeClockFormat(undefined), '24h');
});

test('getClockFormat maps 24-hour and 12-hour patterns, with and without seconds', () => {
    assert.equal(getClockFormat('24h'), '%H:%M');
    assert.equal(getClockFormat('24h', {withSeconds: true}), '%H:%M:%S');
    assert.equal(getClockFormat('12h'), '%I:%M %p');
    assert.equal(getClockFormat('12h', {withSeconds: true}), '%I:%M:%S %p');
    // Invalid stored values degrade to the 24-hour default.
    assert.equal(getClockFormat('invalid'), '%H:%M');
});

test('formatClock delegates to DateTime.format with the resolved pattern', () => {
    assert.equal(formatClock(dateTime('%I:%M %p'), '12h'), 'FORMATTED');
    assert.equal(formatClock(dateTime('%H:%M:%S'), '24h', {withSeconds: true}), 'FORMATTED');
    assert.equal(formatClock({format: () => null}, '24h'), '');
});

test('schema, preferences, and reset group expose clock-format as 24h/12h', () => {
    const schema = read('../schemas/org.gnome.shell.extensions.material-system-actions.gschema.xml');
    assert.match(schema, /<key name="clock-format" type="s">\s*<default>'24h'<\/default>/);

    const prefs = read('../prefs.js');
    assert.match(prefs, /import \{CLOCK_FORMATS, normalizeClockFormat\} from '\.\/lib\/clock-format\.js'/);
    assert.match(prefs, /title: 'Clock format'/);
    assert.match(prefs, /strings: \['24-hour', '12-hour'\]/);
    assert.match(prefs, /settings\.set_string\('clock-format', value\)/);
    assert.match(prefs, /clockRow\.selected = CLOCK_FORMATS\.indexOf/);
});

test('every layout formats its clock through the shared helper', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /import \{getClockFormat\} from '\.\.\/clock-format\.js'/);
    assert.match(base, /formatClock\(dateTime, options = \{\}\)/);
    assert.match(base, /clock\.text = this\.formatClock\(now\)/);

    const plain = ['bento', 'capsule', 'card', 'radial', 'split'];
    for (const name of plain) {
        const source = read(`../lib/layouts/${name}.js`);
        assert.match(source, /this\._clockLabel\.text = this\.formatClock\(now\)/, `${name} clock`);
        assert.doesNotMatch(source, /format\('%H:%M'\)/, `${name} hard-coded clock`);
    }

    const seconds = read('../lib/layouts/list.js');
    assert.match(seconds, /this\.formatClock\(now, \{withSeconds: true\}\)/);
    assert.doesNotMatch(seconds, /format\('%H:%M:%S'\)/);

    const tui = read('../lib/layouts/tui.js');
    assert.match(tui, /this\.formatClock\(now, \{withSeconds: true\}\)/);
    assert.doesNotMatch(tui, /format\('%H:%M:%S'\)/);
});
