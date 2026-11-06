// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('live GNOME guide documents the actual automated commands and runtime APIs', () => {
    const guide = read('../DEVELOPING.md');
    const workflow = read('../.github/workflows/package.yml');
    const readme = read('../README.md');
    const metadata = JSON.parse(read('../metadata.json'));

    assert.ok(guide.includes("node --test --experimental-test-coverage --test-coverage-include='lib/**/*.js' tests/*.test.mjs"));
    assert.match(guide, /\.\/scripts\/package\.sh/);
    assert.match(guide, /glib-compile-schemas --strict schemas\//);
    assert.match(guide, /journalctl --user -f -o cat \/usr\/bin\/gnome-shell/);
    assert.match(guide, /gdbus introspect --session/);
    assert.match(guide, /MaterialSystemActions\.GetStatus/);
    assert.match(guide, /Orca/);
    assert.match(guide, /multi-monitor/i);
    assert.ok(workflow.includes("node --test --experimental-test-coverage --test-coverage-include='lib/**/*.js' tests/*.test.mjs"));
    assert.match(readme, /\[DEVELOPING\.md\]\(DEVELOPING\.md\)/);

    const rangeLine = guide.split('\n').find(line => line.includes('GNOME Shell **'));
    const range = rangeLine?.match(/\d+/g)?.map(Number) ?? [];
    assert.equal(range.length, 2, 'guide must state the declared GNOME Shell compatibility range');
    const declaredVersions = metadata['shell-version'].map(Number);
    assert.equal(range[0], Math.min(...declaredVersions));
    assert.equal(range[1], Math.max(...declaredVersions));
    for (const version of declaredVersions) {
        assert.ok(version >= range[0] && version <= range[1],
            'declared Shell versions must fall inside the documented range');
    }
});
