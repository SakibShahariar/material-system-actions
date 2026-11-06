// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('both confirmation flows use the same overlay component and lifecycle', () => {
    const base = read('../lib/layouts/base.js');
    const component = read('../lib/confirmation-overlay.js');
    const suspend = base.slice(
        base.indexOf('_confirmSuspendWithInhibitors('),
        base.indexOf('_confirmThenRun('),
    );
    const destructive = base.slice(
        base.indexOf('_confirmThenRun('),
        base.indexOf('handleDialogKeyPress('),
    );

    assert.equal((base.match(/createConfirmationOverlay\\(/g) ?? []).length, 1);
    assert.equal((base.match(/this\\._showConfirmation\\(/g) ?? []).length, 2);
    assert.doesNotMatch(suspend, /new St\\.(?:BoxLayout|Button|Label)/);
    assert.doesNotMatch(destructive, /new St\\.(?:BoxLayout|Button|Label)/);
    assert.match(component, /export function createConfirmationOverlay/);
    assert.match(component, /cancelButton\\.connect\\('clicked'/);
    assert.match(component, /confirmButton\\.connect\\('clicked'/);
});

test('shared confirmation component exposes configurable accessible labels and details', () => {
    const component = read('../lib/confirmation-overlay.js');
    const base = read('../lib/layouts/base.js');
    for (const property of [
        'accessibleName', 'accessibleDescription', 'bodyAccessibleDescription',
        'detailsAccessibleName', 'detailsAccessibleDescription',
        'cancelAccessibleName', 'cancelAccessibleDescription',
        'confirmAccessibleName', 'confirmAccessibleDescription',
    ])
        assert.ok(component.includes(property), property + ' must be configurable');
    assert.ok(base.includes('originWidget'));
    assert.ok(base.includes('this._restoreFocus(originWidget)'));
    assert.ok(base.includes('this._confirmation = {'));
    assert.ok(base.includes('cancelBtn: component.cancelButton'));
    assert.ok(base.includes('confirmBtn: component.confirmButton'));
});

