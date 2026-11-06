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

    for (const version of metadata['shell-version'])
        assert.ok(guide.includes(version), `guide should mention declared Shell version ${version}`);
});
