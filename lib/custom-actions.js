// SPDX-License-Identifier: GPL-2.0-or-later

const RESERVED_KEYS = new Set(['l', 'o', 's', 'r', 'p', 'h']);

export function parseCustomActions(serialized) {
    let entries;
    try { entries = JSON.parse(serialized || '[]'); }
    catch (_error) { throw new Error('Custom actions must be valid JSON.'); }
    if (!Array.isArray(entries))
        throw new Error('Custom actions must be a JSON array.');

    const ids = new Set();
    const keys = new Set(RESERVED_KEYS);
    return entries.map((entry, index) => {
        const where = `Custom action ${index + 1}`;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
            throw new Error(`${where} must be an object.`);
        const {id, label, icon, cmd, confirm = true, key = ''} = entry;
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
