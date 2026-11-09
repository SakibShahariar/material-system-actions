// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {parseCssColors, hexToRgba, getMissingThemeRoles} from './theme-colors.js';

export {hexToRgba};

function themeFilePaths() {
    const configured = GLib.getenv('MATUGEN_COLORS_PATH');
    const configDir = GLib.get_user_config_dir();
    return [
        configured,
        GLib.build_filenamev([configDir, 'matugen', 'matugen-colors.css']),
    ].filter(Boolean);
}

const FALLBACK_THEME = {
    background: '#1d1109',
    surface: '#1d1109',
    surface_dim: '#1d1109',
    surface_bright: '#46362c',
    surface_container_lowest: '#170b05',
    surface_container_low: '#261910',
    surface_container: '#2a1d14',
    surface_container_high: '#36271e',
    surface_container_highest: '#413128',
    on_background: '#f8ddcf',
    on_surface: '#f8ddcf',
    on_surface_variant: '#dac2b4',
    outline: '#a28c80',
    outline_variant: '#544339',
    primary: '#ffb689',
    on_primary: '#512300',
    primary_container: '#733500',
    on_primary_container: '#ffdbc8',
    secondary: '#ecbe91',
    on_secondary: '#48290b',
    secondary_container: '#5f401d',
    on_secondary_container: '#ffdcbc',
    tertiary: '#eac077',
    on_tertiary: '#3d2f00',
    tertiary_container: '#5e4202',
    on_tertiary_container: '#ffdea8',
    error: '#ffb4ab',
    on_error: '#690005',
    error_container: '#93000a',
    on_error_container: '#ffdad6',
};

function reportThemeResolution(path, roles) {
    if (GLib.getenv('MATERIAL_SYSTEM_ACTIONS_DEBUG') !== '1')
        return;

    const missing = getMissingThemeRoles(roles, FALLBACK_THEME);
    const source = path ?? 'built-in fallback palette (no Matugen file found)';
    const roleList = missing.length ? missing.join(', ') : 'none';
    log(`material-system-actions: theme source: ${source}`);
    log(`material-system-actions: missing theme roles: ${roleList}`);
    log(`material-system-actions: roles using fallback values: ${roleList}`);
}

export function loadTheme() {
    const path = themeFilePaths().find(candidate => Gio.File.new_for_path(candidate).query_exists(null));
    if (!path) {
        reportThemeResolution(null, {});
        return {...FALLBACK_THEME};
    }
    const file = Gio.File.new_for_path(path);
    try {
        const [ok, contents] = file.load_contents(null);
        if (!ok) {
            reportThemeResolution(path, {});
            return {...FALLBACK_THEME};
        }
        const text = new TextDecoder('utf-8').decode(contents);
        const roles = parseCssColors(text);
        reportThemeResolution(path, roles);
        if (Object.keys(roles).length === 0) return {...FALLBACK_THEME};
        const resolved = {};
        for (const k of Object.keys(FALLBACK_THEME)) resolved[k] = roles[k] ?? FALLBACK_THEME[k];
        return resolved;
    } catch (e) {
        reportThemeResolution(path, {});
        if (GLib.getenv('MATERIAL_SYSTEM_ACTIONS_DEBUG') === '1')
            log(`material-system-actions: failed to parse theme: ${e}`);
        return {...FALLBACK_THEME};
    }
}
