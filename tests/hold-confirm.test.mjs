// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('hold-to-confirm is opt-in and resettable', () => {
    const schema = read('../schemas/org.gnome.shell.extensions.material-system-actions.gschema.xml');
    assert.match(schema, /<key name="hold-to-confirm-enabled" type="b">\s*<default>false<\/default>/);
    const reset = read('../lib/settings-reset.js');
    assert.match(reset, /'hold-to-confirm-enabled'/);
    const prefs = read('../prefs.js');
    assert.match(prefs, /title: 'Hold to confirm'/);
    assert.match(prefs, /settings\.set_boolean\('hold-to-confirm-enabled', holdSwitch\.active\)/);
});

test('only destructive Card and List confirmations require a hold', () => {
    const base = read('../lib/layouts/base.js');
    assert.match(base, /action\.destructive && \['card', 'list'\]\.includes\(this\.dialog\._styleName\)/);
    assert.match(base, /get_boolean\('hold-to-confirm-enabled'\)/);
    assert.match(base, /holdMs: holdEnabled \? 1200 : 0/);
    assert.match(base, /holdMs,\s*onCancel: cleanup/);
});

test('hold mode uses press timers and keeps keyboard confirmation', () => {
    const overlay = read('../lib/confirmation-overlay.js');
    assert.match(overlay, /holdMs = 0/);
    assert.match(overlay, /confirmButton\.connect\('button-press-event'/);
    assert.match(overlay, /GLib\.timeout_add\(GLib\.PRIORITY_DEFAULT, holdMs/);
    assert.match(overlay, /confirmButton\.connect\('button-release-event'/);
    assert.match(overlay, /confirmButton\.connect\('key-press-event'/);
    assert.match(overlay, /Clutter\.KEY_Return, Clutter\.KEY_KP_Enter, Clutter\.KEY_space/);
    assert.match(overlay, /else \{\s*confirmButton\.connect\('clicked'/);
    assert.match(read('../stylesheet.css'), /\.sa-hold-complete/);
    assert.match(read('../README.md'), /Hold to confirm/);
});
