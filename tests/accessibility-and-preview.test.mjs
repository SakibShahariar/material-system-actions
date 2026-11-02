// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const layouts = [
    'card', 'list', 'split', 'grid', 'radial', 'bento', 'tui', 'dock',
    'tiles', 'halo', 'capsule', 'circles', 'avatar', 'pill', 'banner',
];

test('base navigation gives action controls an accessible name', () => {
    const base = source('../lib/layouts/base.js');
    assert.match(base, /registerNav\(widget, action = null\)/);
    assert.match(base, /widget\.accessible_name\s*=\s*action\.label/);
});

test('every layout registers its action controls with the shared navigation helper', () => {
    for (const layout of layouts) {
        const code = source(`../lib/layouts/${layout}.js`);
        assert.match(code, /registerNav\(/, `${layout} has no registered navigation controls`);
        assert.match(
            code,
            /registerNav\(\w+,\s*(?:action|a|this\._destructive\[0\]|\{label:\s*'Cancel'\})\)/,
            `${layout} does not pass action labels to the accessibility helper`,
        );
    }
});

test('all layouts delegate action activation to the shared confirmation and preview guard', () => {
    for (const layout of layouts) {
        const code = source(`../lib/layouts/${layout}.js`);
        assert.match(code, /this\.trigger\(/, `${layout} bypasses the shared action dispatcher`);
        assert.doesNotMatch(code, /this\._run\(/, `${layout} runs a command directly`);
    }
});

test('destructive confirmation buttons have explicit accessible names', () => {
    const base = source('../lib/layouts/base.js');
    assert.match(base, /accessible_name:\s*`Cancel \$\{action\.label\.toLowerCase\(\)\}`/);
    assert.match(base, /accessible_name:\s*`Confirm \$\{action\.label\.toLowerCase\(\)\}`/);
    assert.match(base, /accessible_name:\s*'Cancel suspend'/);
    assert.match(base, /accessible_name:\s*'Force suspend despite sleep inhibitors'/);
});

test('preview mode exits before any action can run', () => {
    const base = source('../lib/layouts/base.js');
    const trigger = base.slice(base.indexOf('    trigger(action) {'), base.indexOf('    _querySleepInhibitors()'));
    assert.match(trigger, /if \(this\.dialog\._previewMode\)\s*\{\s*this\.dialog\.close\(\);\s*return;/);
    assert.ok(trigger.indexOf('_previewMode') < trigger.indexOf('this._run('));
});

test('focus and pressed states share one transition duration and replace stale timers', () => {
    const base = source('../lib/layouts/base.js');
    const dialog = source('../lib/dialog.js');
    const timing = source('../lib/interaction-timing.js');
    const stylesheet = source('../stylesheet.css');

    assert.ok(timing.includes('INTERACTION_STATE_DURATION_MS = 300'));
    assert.ok(base.includes('widget._saPressedTimeoutId'));
    assert.ok(base.includes('GLib.source_remove(previousTimeout)'));
    assert.ok(base.includes('this._setPressedState(widget, true, INTERACTION_STATE_DURATION_MS)'));
    assert.ok(base.includes('this._setPressedState(widget, false)'));
    assert.ok(base.includes("widget.connect('destroy', () => this._setPressedState(widget, false))"));
    assert.ok(dialog.includes('--sa-state-transition-duration: ${INTERACTION_STATE_DURATION_MS}ms;'));
    assert.ok(stylesheet.includes('transition-duration: var(--sa-state-transition-duration, 300ms);'));
});

test('Preferences displays and refreshes the all-actions-hidden warning', () => {
    const prefs = source('../prefs.js');
    assert.ok(prefs.includes('All actions are hidden'));
    assert.ok(prefs.includes('areAllActionsHidden(order, hidden)'));
    assert.ok(prefs.includes("changed::hidden-actions"));
});

test('Preferences exposes the switch-user confirmation setting', () => {
    const prefs = source('../prefs.js');
    assert.ok(prefs.includes('Confirm before switching users'));
    assert.ok(prefs.includes("settings.get_boolean('confirm-switch-user')"));
    assert.ok(prefs.includes("settings.set_boolean('confirm-switch-user'"));
});

test('dialog shows a Preferences recovery state when every available action is hidden', () => {
    const actions = source('../lib/actions.js');
    const dialog = source('../lib/dialog.js');
    const stylesheet = source('../stylesheet.css');
    assert.ok(actions.includes('const allHidden = areAllActionsHidden'));
    assert.ok(dialog.includes('this._actions.allHidden ? this._buildEmptyState() : this._style.buildUI()'));
    assert.ok(dialog.includes('No actions are visible'));
    assert.ok(dialog.includes('Open Preferences and enable at least one action under System actions.'));
    assert.ok(dialog.includes('Clutter.KEY_Escape'));
    assert.ok(stylesheet.includes('.sa-empty-state'));
});

test('status-header density is shared and scoped to layouts that render the header', () => {
    const base = source('../lib/layouts/base.js');
    const prefs = source('../prefs.js');
    const stylesheet = source('../stylesheet.css');
    const helper = source('../lib/status-header.js');
    assert.ok(helper.includes("['comfortable', 'compact']"));
    assert.ok(base.includes('normalizeStatusHeaderDensity(this.dialog._settings.get_string(\'status-header-density\'))'));
    assert.ok(prefs.includes("settings.set_string('status-header-density'"));
    assert.ok(stylesheet.includes('.sa-shared-status-header.sa-status-header-compact'));
});
