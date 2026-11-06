// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('exported D-Bus XML declares the supported method signatures', () => {
    const extension = read('../extension.js');
    const xml = extension.match(/const DBUS_XML = `([\s\S]*?)`;/)?.[1];
    assert.ok(xml, 'extension must define an introspection XML string');

    for (const method of ['Open', 'Close', 'Toggle'])
        assert.match(xml, new RegExp(`<method name="${method}"\\s*/>`), `${method} must be exported`);

    assert.match(
        xml,
        /<method name="Preview"><arg name="style" type="s" direction="in"\/>\s*<\/method>/,
        'Preview must accept one string style ID',
    );
    assert.match(
        xml,
        /<method name="GetStatus"><arg name="version" type="s" direction="out"\/><arg name="layout" type="s" direction="out"\/><arg name="preview" type="b" direction="out"\/><\/method>/,
        'GetStatus must return version, active layout, and preview state',
    );
});

test('every exported method has a handler and the interface is released on disable', () => {
    const extension = read('../extension.js');
    for (const method of ['Open', 'Close', 'Toggle', 'Preview', 'GetStatus'])
        assert.match(extension, new RegExp(`${method}:\\s*\\(?\\s*(?:params)?\\s*\\)?\\s*=>`), `${method} needs a D-Bus handler`);

    assert.match(extension, /this\._dbusObject\?\.unexport\(\)/);
    assert.match(extension, /Gio\.bus_unown_name\(this\._dbusOwnerId\)/);
});

test('GetStatus returns a read-only version/layout/preview tuple and resolves unknown layouts safely', () => {
    const extension = read('../extension.js');
    const dialog = read('../lib/dialog.js');
    assert.match(extension, /GetStatus: \(\) => this\._getStatus\(\)/);
    assert.match(extension, /new GLib\.Variant\('\(ssb\)'/);
    assert.match(extension, /this\.metadata\?\.version \?\? 'unreleased'/);
    assert.match(dialog, /this\._styleName = STYLES\[requestedStyleName\] \? requestedStyleName : DEFAULT_STYLE/);
});

test('README documents the same public D-Bus methods and Preview argument', () => {
    const readme = read('../README.md');
    assert.match(readme, /Methods:\*\*\s*`Open`, `Close`, `Toggle`, `Preview\(s style\)`, and read-only `GetStatus\(\) → \(ssb\)`/);
    assert.match(readme, /GetStatus result:\*\* `\(version, active-layout, preview\)`/);
    assert.match(readme, /MaterialSystemActions\.GetStatus/);
    assert.match(readme, /MaterialSystemActions\.Preview/);
    assert.match(readme, /To open a temporary preview[\s\S]*?layout ID to `Preview`/);
});
