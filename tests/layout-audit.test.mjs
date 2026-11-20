// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAYOUT_METADATA} from '../lib/layouts/metadata.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('readability audit covers every layout and is repeatable', () => {
    const doc = read('../docs/layout-audit.md');
    for (const id of Object.keys(LAYOUT_METADATA)) assert.match(doc, new RegExp(`^\\| \`${id}\` \\|`, 'm'), `${id} must have an audit row`);

    for (const heading of ['How to repeat', 'Per-layout status', 'Fixes made during this audit', 'Remaining limitations']) assert.ok(doc.includes(`## ${heading}`), `${heading} section is required`);

    for (const check of ['text-scaling-factor', 'panel-opacity 0.2', 'high-contrast theme', 'Orca']) assert.ok(doc.includes(check), `${check} must appear in the repeatable checklist`);
});

test('audit is discoverable from the README', () => {
    assert.match(read('../README.md'), /\[Layout readability audit\]\(docs\/layout-audit\.md\)/);
});
