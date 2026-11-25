// SPDX-License-Identifier: GPL-2.0-or-later

export function normalizeHexColor(value) {
    if (typeof value !== 'string') return null;

    const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(value.trim());
    if (!match) return null;

    let digits = match[1];
    if (digits.length === 3) digits = [...digits].map(channel => channel + channel).join('');

    return `#${digits}`;
}

export function parseCssColors(text) {
    const roles = {};
    const re = /--([a-z0-9_]+)\s*:\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{5})?)(?=\s*(?:;|$))/gm;
    let match;
    while ((match = re.exec(text)) !== null) {
        const color = normalizeHexColor(match[2]);
        if (color) roles[match[1]] = color;
    }
    return roles;
}

export function hexToRgba(hex, opacity) {
    const color = normalizeHexColor(hex);
    if (!color) return hex;

    const a = Math.max(0, Math.min(1, Number(opacity) || 0));
    if (a >= 1) return color;
    if (a <= 0) return 'transparent';

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const colorAlpha = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1;
    const combinedAlpha = a * colorAlpha;
    return `rgba(${r},${g},${b},${combinedAlpha})`;
}

// Scale a hex color toward black by factor (1 = unchanged, 0 = black). This
// preserves hue/saturation while lowering lightness — useful for contrast.
export function darkenHex(hex, factor) {
    const color = normalizeHexColor(hex);
    if (!color) return hex;
    const f = Math.max(0, Math.min(1, Number(factor) || 0));
    return (
        '#' +
        [1, 3, 5]
            .map(i =>
                Math.round(parseInt(color.slice(i, i + 2), 16) * f)
                    .toString(16)
                    .padStart(2, '0')
            )
            .join('')
    );
}

export function getMissingThemeRoles(roles, fallbackTheme) {
    const provided = roles && typeof roles === 'object' ? roles : {};
    return Object.keys(fallbackTheme).filter(role => !Object.prototype.hasOwnProperty.call(provided, role));
}
