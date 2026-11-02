// SPDX-License-Identifier: GPL-2.0-or-later

export const STATUS_HEADER_DENSITIES = Object.freeze(['comfortable', 'compact']);

export function normalizeStatusHeaderDensity(value) {
    return STATUS_HEADER_DENSITIES.includes(value) ? value : 'comfortable';
}
