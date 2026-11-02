// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {getActionFailureNotice} from '../lib/action-feedback.js';

test('failure notice identifies the action without exposing argv', () => {
    const notice = getActionFailureNotice('Custom backup');
    assert.equal(notice.title, 'Custom backup failed');
    assert.equal(notice.message, 'Could not start or complete Custom backup. Check the GNOME Shell log for details.');
    assert.doesNotMatch(notice.message, /--token|password|\/usr\/bin/);
});

test('failure notice uses a safe fallback for missing labels', () => {
    assert.deepEqual(getActionFailureNotice(''), {
        title: 'Action failed',
        message: 'Could not start or complete Action. Check the GNOME Shell log for details.',
    });
});
