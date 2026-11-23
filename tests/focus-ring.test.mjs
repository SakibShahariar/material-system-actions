// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../stylesheet.css', import.meta.url), 'utf8');

test('focus rings use only outline, never a spread box-shadow', () => {
    // St renders `box-shadow: 0 0 0 Npx <color>` as an opaque black blob that
    // extends past the widget and makes focused buttons look enormous.
    assert.doesNotMatch(css, /box-shadow:\s*0\s+0\s+0\s+\d+px/);
    const focusRule = css.match(/\.sa-pill-btn:focus[\s\S]*?\n\}/);
    assert.ok(focusRule, 'focus rule exists');
    assert.match(focusRule[0], /outline-style: solid/);
    assert.match(focusRule[0], /outline-width: 3px/);
    assert.match(focusRule[0], /outline-color: var\(--on_surface/);
});

test('focus rings keep the pill surface instead of the shell theme focus fill', () => {
    const focusRule = css.match(/\.sa-pill-btn:focus[\s\S]*?\n\}/);
    assert.match(focusRule[0], /background-color: var\(--surface_container/);
    assert.match(focusRule[0], /color: var\(--on_surface/);

    const secondary = css.match(/\.sa-pill-btn\.sa-tier-secondary:focus[\s\S]*?\n\}/);
    assert.match(secondary[0], /background-color: var\(--secondary_container/);
    const error = css.match(/\.sa-pill-btn\.sa-tier-error:focus[\s\S]*?\n\}/);
    assert.match(error[0], /background-color: var\(--error_container/);
});
