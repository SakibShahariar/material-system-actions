// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../stylesheet.css', import.meta.url), 'utf8');

test('focus rings keep the pill surface instead of the shell theme focus fill', () => {
    const focusRule = /\.sa-pill-btn:focus[\s\S]*?outline-color: var\(--primary[\s\S]*?\}\n/;
    const match = css.match(focusRule);
    assert.ok(match, 'focus rule exists');
    assert.match(match[0], /background-color: var\(--surface_container/);
    assert.match(match[0], /color: var\(--on_surface/);
    assert.match(match[0], /box-shadow: 0 0 0 6px var\(--sa-glow-primary[^\n]*!important;/);
});

test('semantic tiers keep their surface color while focused', () => {
    const secondary = css.match(/\.sa-pill-btn\.sa-tier-secondary:focus[\s\S]*?\}/);
    assert.ok(secondary);
    assert.match(secondary[0], /background-color: var\(--secondary_container/);
    const error = css.match(/\.sa-pill-btn\.sa-tier-error:focus[\s\S]*?\}/);
    assert.ok(error);
    assert.match(error[0], /background-color: var\(--error_container/);
    assert.match(error[0], /box-shadow:[^\n]*!important;/);
});
