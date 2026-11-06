// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('coverage baseline records the successful CI report and GJS exclusions', () => {
    const baseline = read('../docs/maintenance/coverage-baseline.md');
    const workflow = read('../.github/workflows/package.yml');
    assert.ok(baseline.includes('99.17%'));
    assert.ok(baseline.includes('95.41%'));
    assert.ok(baseline.includes('97.87%'));
    assert.ok(baseline.includes('93 / 93'));
    assert.ok(baseline.includes('extension.js'));
    assert.ok(baseline.includes('prefs.js'));
    assert.ok(baseline.includes('lib/layouts/*.js'));
    assert.ok(workflow.includes("--experimental-test-coverage --test-coverage-include='lib/**/*.js'"));
});
