// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('every registered layout implements the shared layout contract', () => {
    const registry = source('../lib/layouts/registry.js');
    const base = source('../lib/layouts/base.js');
    const imports = new Map(
        [...registry.matchAll(/^import \{(\w+)\} from '\.\/([^']+)\.js';$/gm)]
            .map(([, className, file]) => [className, file]),
    );
    const stylesBlock = registry.match(/export const STYLES = \{([\s\S]*?)\n\};/);
    assert.ok(stylesBlock, 'STYLES registry must be present');
    const entries = [...stylesBlock[1].matchAll(/^\s*([a-z0-9_]+):\s*(\w+),$/gm)];
    assert.ok(entries.length > 0, 'STYLES registry must not be empty');

    assert.match(base, /this\.position\s*=\s*null/, 'BaseStyle must define the centered default position');
    assert.match(base, /registerNav\(/, 'BaseStyle must provide shared navigation registration');
    assert.match(base, /trigger\(action\)/, 'BaseStyle must provide shared action dispatch');

    const validPositions = new Set(['top', 'bottom', 'left-edge', 'fullscreen']);
    for (const [, styleName, registeredClass] of entries) {
        let className = registeredClass;
        let file = imports.get(className);
        assert.ok(file, `registered style "${styleName}" must import its implementation`);

        let code = source(`../lib/layouts/${file}.js`);
        const alias = code.match(/export \{\s*(\w+)\s+as\s+\w+\s*\} from '\.\/([^']+)\.js';/);
        if (alias) {
            className = alias[1];
            file = alias[2];
            code = source(`../lib/layouts/${file}.js`);
        }

        assert.match(code, new RegExp(`export class ${className} extends BaseStyle\\b`),
            `${styleName} must extend BaseStyle (directly or through its compatibility alias)`);
        assert.match(code, /buildUI\s*\(/, `${styleName} must implement buildUI()`);
        assert.match(code, /registerNav\(/, `${styleName} must register accessible navigation controls`);
        assert.match(code, /this\.trigger\(/, `${styleName} must route actions through BaseStyle.trigger()`);
        assert.doesNotMatch(code, /this\._run\(/, `${styleName} must not bypass shared action dispatch`);

        const positions = [...code.matchAll(/this\.position\s*=\s*['"]([^'"]+)['"]/g)]
            .map(([, position]) => position);
        for (const position of positions) {
            assert.ok(validPositions.has(position),
                `${styleName} uses unsupported dialog position "${position}"`);
        }
    }
});
