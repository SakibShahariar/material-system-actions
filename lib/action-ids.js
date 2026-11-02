// SPDX-License-Identifier: GPL-2.0-or-later

// Keep this list aligned with the built-in action definitions in actions.js.
export const BUILTIN_ACTION_IDS = Object.freeze([
    'lock',
    'logout',
    'suspend',
    'hibernate',
    'reboot',
    'shutdown',
]);

const BUILTIN_ACTION_ID_SET = new Set(BUILTIN_ACTION_IDS);

export function isBuiltInActionId(id) {
    return BUILTIN_ACTION_ID_SET.has(id);
}
