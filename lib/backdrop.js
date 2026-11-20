// SPDX-License-Identifier: GPL-2.0-or-later

/**
 * Values for the ModalDialog lightbox. Radial brightness is inverted: 1.0 is
 * fully transparent and lower values dim more. Non-radial shells shade by
 * actor opacity, also inverted.
 */
export function backdropSettings(enabled, strong = false) {
    if (!enabled)
        return {brightness: 1.0, sharpness: 0.0, opacity: 0};
    if (strong)
        return {brightness: 0.25, sharpness: 0.9, opacity: Math.round(255 * 0.35)};
    return {brightness: 0.5, sharpness: 0.7, opacity: Math.round(255 * 0.5)};
}
