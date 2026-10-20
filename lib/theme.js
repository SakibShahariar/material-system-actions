// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

function themeFilePaths() {
    const configured = GLib.getenv('MATUGEN_COLORS_PATH');
    const configDir = GLib.get_user_config_dir();
    return [
        configured,
        GLib.build_filenamev([configDir, 'matugen', 'matugen-colors.css']),
        GLib.build_filenamev([configDir, 'ags', 'colors.css']),
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

function parseCssColors(text) {
    const roles = {};
    const re = /--([a-z0-9_]+)\s*:\s*(#[0-9a-fA-F]{6})(?:\s*;|\s*$)/gm;
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

/**
 * Watch the directories containing Matugen color files. Watching directories
 * rather than just the file also handles generators that atomically replace
 * the CSS file instead of writing into the existing inode.
 */
export function watchTheme(onChange) {
    const paths = themeFilePaths().map(path =>
        GLib.canonicalize_filename(path, GLib.get_current_dir()));
    const pathSet = new Set(paths);
    const configDir = GLib.canonicalize_filename(
        GLib.get_user_config_dir(), GLib.get_current_dir());
    const targetDirectories = new Set(paths.map(path => GLib.path_get_dirname(path)));
    const monitors = new Map();
    let timeoutId = 0;
    let cancelled = false;

    const scheduleReload = () => {
        if (timeoutId)
            GLib.source_remove(timeoutId);
        timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            timeoutId = 0;
            if (!cancelled)
                onChange(loadTheme());
            return GLib.SOURCE_REMOVE;
        });
    };

    const stopMonitors = () => {
        for (const monitor of monitors.values())
            monitor.cancel();
        monitors.clear();
    };

    const startMonitors = () => {
        if (cancelled)
            return;
        stopMonitors();

        // Always watch the config root as well. If an optional output folder
        // is created after the popup opens, this monitor lets us attach a
        // direct watcher to it rather than silently missing future updates.
        const directories = new Set([configDir]);
        for (const directory of targetDirectories) {
            let candidate = directory;
            while (candidate !== configDir &&
                   !Gio.File.new_for_path(candidate).query_exists(null)) {
                const parent = GLib.path_get_dirname(candidate);
                if (parent === candidate)
                    break;
                candidate = parent;
            }
            directories.add(candidate);
            if (Gio.File.new_for_path(directory).query_exists(null))
                directories.add(directory);
        }

        for (const directory of directories) {
            try {
                const monitor = Gio.File.new_for_path(directory)
                    .monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null);
                monitor.connect('changed', (_monitor, file, otherFile) => {
                    const changedPaths = [file, otherFile]
                        .filter(Boolean)
                        .map(candidate => candidate.get_path())
                        .filter(Boolean)
                        .map(path => GLib.canonicalize_filename(path, GLib.get_current_dir()));

                    if (changedPaths.some(path => pathSet.has(path))) {
                        scheduleReload();
                    }

                    // A target directory may have appeared or disappeared.
                    // Rebuild monitors only for directory-level changes that
                    // can affect a configured Matugen path.
                    if (changedPaths.some(path =>
                        targetDirectories.has(path) ||
                        [...targetDirectories].some(target =>
                            target.startsWith(path + GLib.DIR_SEPARATOR)))) {
                        startMonitors();
                        scheduleReload();
                    }
                });
                monitors.set(directory, monitor);
            } catch (e) {
                log(`material-system-actions: cannot watch theme directory ${directory}: ${e.message}`);
            }
        }
    };

    startMonitors();

    return {
        cancel() {
            cancelled = true;
            if (timeoutId) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
            }
            stopMonitors();
        },
    };
}
