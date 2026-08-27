// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';

const THEME_FILE_PATH = '/home/sakib/.zen/ke09ovgb.myuser/chrome/colors.css';

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

export function withOpacity(color, opacity) {
    if (opacity == null || opacity >= 0.995) return color;
    const a = Math.max(0, Math.min(1, opacity)).toFixed(2);
    return `alpha(${color}, ${a})`;
}

export function loadTheme() {
    const file = Gio.File.new_for_path(THEME_FILE_PATH);
    if (!file.query_exists(null)) {
        log(`material-system-actions: theme file not found at ${THEME_FILE_PATH}, using fallback`);
        return {...FALLBACK_THEME};
    }
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
