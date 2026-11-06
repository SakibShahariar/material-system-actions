// SPDX-License-Identifier: GPL-2.0-or-later

// Canonical, framework-independent metadata for the 15 supported layouts.
// Keep this module free of GNOME imports so Preferences, documentation, and
// automated tests can consume the same definitions.
export const LAYOUT_METADATA = Object.freeze({
    card: Object.freeze({displayName: 'Card', description: 'Header with pill buttons', recommendedUse: 'Balanced everyday controls', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    list: Object.freeze({displayName: 'List', description: 'Keyboard-first list with key badges', recommendedUse: 'Compact, keyboard-led navigation', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    split: Object.freeze({displayName: 'Split', description: 'Large clock with circular dock', recommendedUse: 'Clock-focused presentation with prominent controls', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    grid: Object.freeze({displayName: 'Grid', description: 'Numbered icon tiles', recommendedUse: 'Fast visual selection and numeric shortcuts', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    radial: Object.freeze({displayName: 'Radial', description: 'Icons arranged around a clock hub', recommendedUse: 'Centered, clock-focused presentation', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    bento: Object.freeze({displayName: 'Bento', description: 'Asymmetric dashboard', recommendedUse: 'Dashboard-style arrangement of actions', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    tui: Object.freeze({displayName: 'TUI', description: 'Terminal-inspired box drawing', recommendedUse: 'Text-like, keyboard-oriented presentation', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    dock: Object.freeze({displayName: 'Dock', description: 'Vertical edge dock', recommendedUse: 'Edge-aligned, space-efficient controls', supportsSharedStatusHeader: true, previewPosition: 'left-edge'}),
    tiles: Object.freeze({displayName: 'Tiles', description: 'Square tile row', recommendedUse: 'Horizontal tile controls', supportsSharedStatusHeader: true, previewPosition: 'center'}),
    halo: Object.freeze({displayName: 'Halo', description: 'Dot-ring hold-to-confirm interaction', recommendedUse: 'Hold-to-confirm visual interaction', supportsSharedStatusHeader: true, previewPosition: 'center'}),
    capsule: Object.freeze({displayName: 'Capsule', description: 'Rounded pill rows', recommendedUse: 'Grouped, touch-friendly action rows', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    circles: Object.freeze({displayName: 'Circles', description: 'Floating stack of circular actions', recommendedUse: 'Compact floating controls', supportsSharedStatusHeader: true, previewPosition: 'center'}),
    avatar: Object.freeze({displayName: 'Avatar', description: 'Large avatar with action list', recommendedUse: 'User-focused header with a clear action list', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    pill: Object.freeze({displayName: 'Pill', description: 'Compact status area with icons', recommendedUse: 'Minimal, compact action strip', supportsSharedStatusHeader: false, previewPosition: 'center'}),
    banner: Object.freeze({displayName: 'Banner', description: 'Wallpaper-style banner with actions', recommendedUse: 'Wide presentation with prominent action buttons', supportsSharedStatusHeader: false, previewPosition: 'center'}),
});

export function renderLayoutCatalogMarkdown() {
    const header = '| Layout | Description | Recommended use | Shared status header | Preview position |';
    const separator = '|---|---|---|---|---|';
    const rows = Object.entries(LAYOUT_METADATA).map(([id, metadata]) =>
        '| \`' + id + '\` | ' + metadata.description + ' | ' + metadata.recommendedUse + ' | ' +
        (metadata.supportsSharedStatusHeader ? 'Yes' : 'No') + ' | \`' + metadata.previewPosition + '\` |'
    );
    return [header, separator, ...rows].join('\n');
}
