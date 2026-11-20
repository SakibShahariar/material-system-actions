// SPDX-License-Identifier: GPL-2.0-or-later

import {isBuiltInActionId} from './action-ids.js';

/** Turn a JSON parse error position into a human-readable line/column hint. */
export function jsonErrorLocation(text, error) {
    const message = String(error?.message ?? '');
    const lineColumn = message.match(/line (\d+) column (\d+)/);
    if (lineColumn)
        return {line: Number(lineColumn[1]), column: Number(lineColumn[2])};
    const match = message.match(/position (\d+)/);
    if (!match)
        return null;
    const position = Number(match[1]);
    const before = text.slice(0, position);
    return {
        line: before.split('\n').length,
        column: position - before.lastIndexOf('\n'),
    };
}

const RESERVED_KEYS = new Set(['l', 'o', 's', 'r', 'p', 'h', 'y']);

export function formatJsonErrorMessage(text, error) {
    const parseError = error?.parseError;
    const location = jsonErrorLocation(text, parseError ?? error);
    const message = String(error?.message ?? parseError?.message ?? 'Invalid JSON');
    return location
        ? `${message} (line ${location.line}, column ${location.column})`
        : message;
}

export function parseCustomActions(serialized) {
    let entries;
    try { entries = JSON.parse(serialized || '[]'); }
    catch (parseError) {
        const error = new Error('Custom actions must be valid JSON.');
        error.parseError = parseError;
        throw error;
    }
    if (!Array.isArray(entries))
        throw new Error('Custom actions must be a JSON array.');

    const ids = new Set();
    const keys = new Set(RESERVED_KEYS);
    return entries.map((entry, index) => {
        const where = `Custom action ${index + 1}`;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
            throw new Error(`${where} must be an object.`);
        const {id, label, icon, cmd, confirm = true, key = ''} = entry;
        if (typeof id === 'string' && isBuiltInActionId(id))
            throw new Error(`${where}: id "${id}" collides with a built-in action.`);
        if (typeof id !== 'string' || !/^custom-[a-z0-9][a-z0-9-]{0,40}$/.test(id))
            throw new Error(`${where}: id must start with "custom-" and contain only lowercase letters, numbers, and hyphens.`);
        if (ids.has(id)) throw new Error(`${where}: duplicate id "${id}".`);
        ids.add(id);
        if (typeof label !== 'string' || !label.trim() || label.length > 48)
            throw new Error(`${where}: label must contain 1–48 characters.`);
        if (typeof icon !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}-symbolic$/.test(icon))
            throw new Error(`${where}: icon must be a symbolic icon name ending in "-symbolic".`);
        if (!Array.isArray(cmd) || cmd.length < 1 || cmd.length > 32 ||
            cmd.some(arg => typeof arg !== 'string' || arg.length === 0 || arg.length > 1024))
            throw new Error(`${where}: cmd must be a non-empty array of command/argument strings.`);
        if (typeof confirm !== 'boolean')
            throw new Error(`${where}: confirm must be true or false.`);
        if (typeof key !== 'string' || (key !== '' && !/^[a-z]$/.test(key)))
            throw new Error(`${where}: key must be one lowercase letter or an empty string.`);
        if (key && keys.has(key))
            throw new Error(`${where}: shortcut "${key}" is already reserved or used.`);
        if (key) keys.add(key);
        return {id, label: label.trim(), icon, cmd: [...cmd], destructive: confirm, key: key || null, custom: true};
    });
}
