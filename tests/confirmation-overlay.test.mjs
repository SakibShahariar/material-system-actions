// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('both confirmation flows use the same overlay component and lifecycle', () => {
    const base = read('../lib/layouts/base.js');
    const component = read('../lib/confirmation-overlay.js');
    const suspend = base.slice(
        base.indexOf('    _confirmSuspendWithInhibitors('),
        base.indexOf('    _confirmThenRun('),
    );
    const destructive = base.slice(
        base.indexOf('    _confirmThenRun('),
        base.indexOf('    handleDialogKeyPress('),
    );

    assert.equal(base.split('createConfirmationOverlay(').length - 1, 1);
    assert.equal(base.split('this._showConfirmation({').length - 1, 2);
    assert.ok(!suspend.includes('new St.BoxLayout('));
    assert.ok(!suspend.includes('new St.Button('));
    assert.ok(!suspend.includes('new St.Label('));
    assert.ok(!destructive.includes('new St.BoxLayout('));
    assert.ok(!destructive.includes('new St.Button('));
    assert.ok(!destructive.includes('new St.Label('));
    assert.ok(component.includes('export function createConfirmationOverlay'));
    assert.ok(component.includes("cancelButton.connect('clicked'"));
    assert.ok(component.includes("confirmButton.connect('clicked'"));
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
