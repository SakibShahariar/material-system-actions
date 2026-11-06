// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('coverage baseline records the successful CI report and GJS exclusions', () => {
    const baseline = read('../docs/maintenance/coverage-baseline.md');
    const workflow = read('../.github/workflows/package.yml');
    assert.match(baseline, /99\.17%/);
    assert.match(baseline, /95\.41%/);
    assert.match(baseline, /97\.87%/);
    assert.match(baseline, /93 \\/ 93/);
    assert.match(baseline, /extension\.js.*prefs\.js/s);
    assert.match(baseline, /lib\\/layouts\\/\\*\\.js/);
    assert.ok(workflow.includes("--experimental-test-coverage --test-coverage-include='lib/**/*.js'"));
});
