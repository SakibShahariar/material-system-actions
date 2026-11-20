// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyDiscoveryError, formatDiscoveryDiagnostic} from '../lib/logind-diagnostics.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('logind discovery errors are classified as timeout, unavailable, or error', () => {
    assert.equal(classifyDiscoveryError({code: 20, message: 'Timeout was reached'}), 'timeout');
    assert.equal(classifyDiscoveryError({code: 2, message: 'Service org.freedesktop.login1 unknown'}), 'unavailable');
    assert.equal(classifyDiscoveryError({message: 'did not receive a reply within timeout'}), 'timeout');
    assert.equal(classifyDiscoveryError({message: 'No such session'}), 'unavailable');
    assert.equal(classifyDiscoveryError({code: 19, message: 'Unknown method'}), 'error');
    assert.equal(classifyDiscoveryError(null), 'error');
});

test('diagnostics include duration and the sanitized outcome', () => {
    const message = formatDiscoveryDiagnostic('CanHibernate', {code: 2, message: 'Service unknown'}, 17);
    assert.equal(message, 'logind discovery CanHibernate: unavailable after 17 ms: Service unknown');
});

test('actions log bounded logind discovery outcomes in debug mode', () => {
    const source = read('../lib/actions.js');
    assert.match(source, /MATERIAL_SYSTEM_ACTIONS_DEBUG/);
    assert.match(source, /formatDiscoveryDiagnostic\('session properties', error/);
    assert.match(source, /formatDiscoveryDiagnostic\('ListSessions', error/);
    assert.match(source, /formatDiscoveryDiagnostic\('CanHibernate', error/);
    assert.match(source, /call_sync\([\s\S]*?500,[\s\S]*?\)/);
    assert.match(source, /call_sync\([\s\S]*?700,[\s\S]*?\)/);
    assert.match(source, /call_sync\([\s\S]*?1200,[\s\S]*?\)/);
});
