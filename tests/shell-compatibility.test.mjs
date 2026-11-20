// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('compatibility matrix covers every declared Shell version', () => {
    const metadata = JSON.parse(read('../metadata.json'));
    const doc = read('../docs/compatibility.md');
    const rows = doc.split('\n').filter(line => /^\| \d+ \|/.test(line));
    const documented = rows.map(line => Number(line.match(/^\| (\d+) \|/)[1]));

    assert.deepEqual([...documented].sort((a, b) => a - b),
        [...metadata['shell-version']].map(Number).sort((a, b) => a - b));
    for (const line of rows)
        assert.match(line, /\|\s*(Live-tested|Untested)\s*\|/, 'each version needs an explicit status');
});

test('new GI or Shell module usage requires a compatibility review', () => {
    const doc = read('../docs/compatibility.md');
    const files = ['../extension.js', '../prefs.js',
        ...readdirSync(new URL('../lib', import.meta.url)).filter(f => f.endsWith('.js')).map(f => `../lib/${f}`),
        ...readdirSync(new URL('../lib/layouts', import.meta.url)).filter(f => f.endsWith('.js')).map(f => `../lib/layouts/${f}`)];
    const modules = new Set();
    for (const file of files) {
        for (const match of read(file).matchAll(/from '([^']+)'/g)) {
            const specifier = match[1].replace(/\?version=.*$/, '');
            if (specifier.startsWith('gi://') || specifier.startsWith('resource:///org/gnome/shell'))
                modules.add(specifier);
        }
    }
    assert.ok(modules.size > 0);
    for (const specifier of modules)
        assert.ok(doc.includes(`\`${specifier}\``), `${specifier} must be recorded in docs/compatibility.md`);
});

test('compatibility status is discoverable from the docs', () => {
    const readme = read('../README.md');
    const guide = read('../DEVELOPING.md');
    assert.match(readme, /\[Compatibility matrix\]\(docs\/compatibility\.md\)/);
    assert.match(guide, /\[compatibility matrix\]\(docs\/compatibility\.md\)/);
});
