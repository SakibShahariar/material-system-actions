// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

function themeFilePaths() {
    const configured = GLib.getenv('MATUGEN_COLORS_PATH');
    const configDir = GLib.get_user_config_dir();
    return [
        configured,
        GLib.build_filenamev([configDir, 'matugen', 'colors.css']),
        GLib.build_filenamev([configDir, 'ags', 'colors.css']),
    ].filter(Boolean);
}

const FALLBACK_THEME = {
    surface: '#141218',
    surface_container: '#2b2930',
    surface_container_high: '#322f37',
    surface_container_low: '#1e1e26',
    on_surface: '#e6e0e9',
    on_surface_variant: '#cac4cf',
    outline: '#938f99',
    outline_variant: '#49454f',
    primary: '#d0bcff',
    on_primary: '#381e72',
    primary_container: '#4f378b',
    on_primary_container: '#eaddff',
    secondary: '#ccc2dc',
    secondary_container: '#4a4458',
    error: '#ffb4ab',
    error_container: '#93000a',
};

function parseCssColors(text) {
    const roles = {};
    const re = /--([a-z0-9_]+):\s*(#[0-9a-fA-F]{6});/g;
    let m;
    while ((m = re.exec(text)) !== null) roles[m[1]] = m[2];
    return roles;
}

export function hexToRgba(hex, opacity) {
    const a = Math.max(0, Math.min(1, Number(opacity) || 0));
    if (a >= 1) return hex;
    if (a <= 0) return 'transparent';
    const h = hex.startsWith('#') ? hex : `#${hex}`;
    if (h.length === 4) {
        const r = parseInt(h[1] + h[1], 16);
        const g = parseInt(h[2] + h[2], 16);
        const b = parseInt(h[3] + h[3], 16);
        return `rgba(${r},${g},${b},${a})`;
    }
    const r = parseInt(h.slice(1, 3), 16);
    const g = parseInt(h.slice(3, 5), 16);
    const b = parseInt(h.slice(5, 7), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
    return `rgba(${r},${g},${b},${a})`;
}

export function loadTheme() {
    const path = themeFilePaths().find(candidate => Gio.File.new_for_path(candidate).query_exists(null));
    if (!path) {
        log('material-system-actions: no Matugen colors file found, using fallback');
        return {...FALLBACK_THEME};
    }
    const file = Gio.File.new_for_path(path);
    try {
        const [ok, contents] = file.load_contents(null);
        if (!ok) return {...FALLBACK_THEME};
        const text = new TextDecoder('utf-8').decode(contents);
        const roles = parseCssColors(text);
        if (Object.keys(roles).length === 0) return {...FALLBACK_THEME};
        const resolved = {};
        for (const k of Object.keys(FALLBACK_THEME)) resolved[k] = roles[k] ?? FALLBACK_THEME[k];
        return resolved;
    } catch (e) {
        log(`material-system-actions: failed to parse theme: ${e}`);
        return {...FALLBACK_THEME};
    }
}
