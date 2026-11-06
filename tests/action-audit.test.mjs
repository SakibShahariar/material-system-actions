// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('custom-action audit logging is opt-in and records lifecycle diagnostics', () => {
    const process = read('../lib/process.js');
    const base = read('../lib/layouts/base.js');

    assert.ok(process.includes("auditCustomAction && GLib.getenv('MATERIAL_SYSTEM_ACTIONS_DEBUG') === '1'"));
    assert.ok(process.includes("debug('invoked')"));
    assert.ok(process.includes("debug('spawn succeeded')"));
    assert.ok(process.includes("debug('spawn failed: ' + error.message)"));
    assert.ok(process.includes('get_exit_status()'));
    assert.ok(process.includes('get_term_sig()'));
    assert.ok(process.includes('elapsedMs()'));
    assert.ok(process.includes('error.message'));
    assert.ok(base.includes('spawnCommand(cmd, actionLabel, auditCustomAction)'));
    assert.ok(base.includes("action.id.startsWith('custom-')"));
});

test('custom-action audit logging never captures command output or argv', () => {
    const process = read('../lib/process.js');
    assert.doesNotMatch(process, /communicate_utf8|communicate_async|communicate\(/);
    assert.doesNotMatch(process, /log\([^)]*argv/);
    assert.ok(process.includes(".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')"));
});
