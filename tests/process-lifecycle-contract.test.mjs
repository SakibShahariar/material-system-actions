// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('extension disable releases subprocess wait tracking without killing children', () => {
    const extension = readFileSync(new URL('../extension.js', import.meta.url), 'utf8');
    const process = readFileSync(new URL('../lib/process.js', import.meta.url), 'utf8');
    assert.ok(extension.includes('cleanupProcesses()'));
    assert.ok(process.includes('processTracker.track(process, cancellable)'));
    assert.ok(process.includes('cancellable.cancel()'));
    assert.ok(!process.includes('force_exit'));
    assert.ok(!process.includes('send_signal'));
});
