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

    assert.match(guide, /node --test tests\/\*\.test\.mjs/);
    assert.match(guide, /\.\/scripts\/package\.sh/);
    assert.match(guide, /glib-compile-schemas --strict schemas\//);
    assert.match(guide, /journalctl --user -f -o cat \/usr\/bin\/gnome-shell/);
    assert.match(guide, /gdbus introspect --session/);
    assert.match(guide, /MaterialSystemActions\.GetStatus/);
    assert.match(guide, /Orca/);
    assert.match(guide, /multi-monitor/i);
    assert.match(workflow, /node --test tests\/\*\.test\.mjs/);
    assert.match(readme, /\[DEVELOPING\.md\]\(DEVELOPING\.md\)/);

    const declaredRange = guide.match(/GNOME Shell \\*\\*(\\d+)–(\\d+)\\*\\*/);
    assert.ok(declaredRange, 'guide must state the declared GNOME Shell compatibility range');
    for (const version of metadata['shell-version']) {
        assert.ok(Number(version) >= Number(declaredRange[1]) &&
            Number(version) <= Number(declaredRange[2]),
        `declared Shell version ${version} must fall inside the documented range`);
    }
});
