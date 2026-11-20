// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ProcessTracker} from '../lib/process-tracker.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

const fakeProcess = () => {
    let exited = false;
    return {
        force_exit() {
            exited = true;
        },
        get exited() {
            return exited;
        }
    };
};

test('running custom actions are listed and can be terminated explicitly', () => {
    const tracker = new ProcessTracker();
    const process = fakeProcess();
    const cancellable = {cancel() {}};
    tracker.track(process, cancellable, {id: 'custom-vpn', label: 'Toggle VPN'});
    tracker.track(fakeProcess(), {cancel() {}});

    assert.deepEqual(tracker.listRunning(), [{id: 'custom-vpn', label: 'Toggle VPN', process}]);
    assert.equal(tracker.terminate('missing'), false);
    assert.equal(tracker.terminate('custom-vpn'), true);
    assert.equal(process.exited, true);
    assert.equal(tracker.size, 2, 'terminate does not remove the wait entry');
});

test('disable still cancels waits without terminating children', () => {
    const tracker = new ProcessTracker();
    const process = fakeProcess();
    tracker.track(process, {cancel() {}}, {id: 'custom-vpn', label: 'VPN'});
    assert.equal(tracker.cancelWaits(), 1);
    assert.equal(process.exited, false);
    assert.equal(tracker.listRunning().length, 0);
});

test('custom action spawning carries an id and the indicator watches it', () => {
    const process = read('../lib/process.js');
    assert.match(process, /actionId = null/);
    assert.match(process, /\{id: actionId, label: safeLabel\}/);
    assert.match(process, /export function getRunningCustomActions/);
    assert.match(process, /export function terminateCustomAction/);

    const base = read('../lib/layouts/base.js');
    assert.match(base, /spawnCommand\(cmd, actionLabel, auditCustomAction, actionId\)/);
    assert.match(base, /runningIndicator\.watch\(actionId, actionLabel\)/);
    assert.match(base, /get_boolean\('hold-to-confirm-enabled'\)/);
});

test('indicator uses a grace period, a Cancel action, and cleans up', () => {
    const source = read('../lib/running-indicator.js');
    assert.match(source, /GRACE_MS = 1500/);
    assert.match(source, /source\.addNotification\(notification\)/);
    assert.match(source, /source\.showNotification\(notification\)/);
    assert.match(source, /notification\.addAction\('Cancel'/);
    assert.match(source, /terminateCustomAction\(id\)/);
    assert.match(source, /clear\(\)/);
    const extension = read('../extension.js');
    assert.match(extension, /runningIndicator\.clear\(\)/);
    const compatibility = read('../docs/compatibility.md');
    assert.match(compatibility, /resource:\/\/\/org\/gnome\/shell\/ui\/messageTray\.js/);
    assert.match(read('../README.md'), /resident notification/);
});
