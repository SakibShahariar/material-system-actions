// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('custom-action audit logging is opt-in and records lifecycle diagnostics', () => {
    const process = read('../lib/process.js');
    const base = read('../lib/layouts/base.js');

    assert.match(process, /auditCustomAction && GLib\.getenv\('MATERIAL_SYSTEM_ACTIONS_DEBUG'\) === '1'/);
    assert.match(process, /debug\('invoked'\)/);
    assert.match(process, /spawn succeeded/);
    assert.match(process, /spawn failed/);
    assert.match(process, /get_exit_status\(\)/);
    assert.match(process, /get_term_sig\(\)/);
    assert.match(process, /elapsedMs\(\)/);
    assert.match(process, /error\.message/);
    assert.match(base, /spawnCommand\(cmd, actionLabel, auditCustomAction\)/);
    assert.match(base, /action\.id\.startsWith\('custom-'\)/);
});

test('custom-action audit logging never captures command output or argv', () => {
    const process = read('../lib/process.js');
    assert.doesNotMatch(process, /communicate_utf8|communicate_async|communicate\(/);
    assert.doesNotMatch(process, /log\([^)]*argv/);
    assert.match(process, /replace\(\/\[\\u0000-\\u001f\\u007f\]\/g, ' '\)/);
});
