// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAYOUT_METADATA, renderLayoutCatalogMarkdown} from '../lib/layouts/metadata.js';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('structured metadata covers every generic layout without changing compatibility aliases', () => {
    const registry = source('../lib/layouts/registry.js');
    const styles = registry.match(/export const STYLES = \{([\s\S]*?)\n\};/);
    assert.ok(styles, 'the public style registry must exist');
    const registeredIds = [...styles[1].matchAll(/^\s*([a-z0-9_]+):\s*\w+,/gm)]
        .map(([, id]) => id);
    const layoutIds = Object.keys(LAYOUT_METADATA);

    assert.equal(layoutIds.length, 15);
    assert.deepEqual(registeredIds.slice(0, layoutIds.length), layoutIds);
    assert.match(registry, /export \{LAYOUT_METADATA\} from '\.\/metadata\.js';/);
    for (const [id, metadata] of Object.entries(LAYOUT_METADATA)) {
        assert.ok(metadata.displayName, `${id} needs a display name`);
        assert.ok(metadata.description, `${id} needs a description`);
        assert.ok(metadata.recommendedUse, `${id} needs a recommended use`);
        assert.equal(typeof metadata.supportsSharedStatusHeader, 'boolean');
        assert.ok(['center', 'top', 'bottom', 'left-edge', 'fullscreen'].includes(metadata.previewPosition));
    }
    assert.match(registry, /rofi:\s*RofiStyle/);
    assert.match(registry, /quickshell:\s*QuickshellStyle/);
    assert.match(registry, /wlogout:\s*WlogoutStyle/);
    assert.match(registry, /dots:\s*DotsStyle/);
    assert.match(registry, /end4:\s*End4Style/);
});

test('Preferences derives layout labels and ordering from the metadata registry', () => {
    const prefs = source('../prefs.js');
    assert.match(prefs, /import \{LAYOUT_METADATA\} from '\.\/lib\/layouts\/metadata\.js';/);
    assert.match(prefs, /const STYLE_NAMES = Object\.keys\(LAYOUT_METADATA\);/);
    assert.match(prefs, /metadata\.displayName/);
    assert.match(prefs, /metadata\.description/);
});

test('README layout catalog stays synchronized with the shared metadata', () => {
    const readme = source('../README.md');
    const catalog = readme.match(/<!-- BEGIN GENERATED LAYOUT CATALOG -->\n([\s\S]*?)\n<!-- END GENERATED LAYOUT CATALOG -->/);
    assert.ok(catalog, 'README must contain the generated layout catalog markers');
    assert.equal(catalog[1], renderLayoutCatalogMarkdown());
});

test('shared status-header and preview-position metadata match layout implementations', () => {
    const sharedHeaderLayouts = Object.entries(LAYOUT_METADATA)
        .filter(([, metadata]) => metadata.supportsSharedStatusHeader)
        .map(([id]) => id);
    assert.deepEqual(sharedHeaderLayouts, ['dock', 'tiles', 'halo', 'circles']);
    assert.equal(LAYOUT_METADATA.dock.previewPosition, 'left-edge');
    assert.ok(Object.entries(LAYOUT_METADATA)
        .filter(([id]) => id !== 'dock')
        .every(([, metadata]) => metadata.previewPosition === 'center'));
});
