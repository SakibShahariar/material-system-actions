// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio';

/**
 * Spawn an argv command and resolve only when it exits successfully.
 * Synchronous spawn errors are thrown; non-zero exit and wait errors reject.
 */
export function spawnCommand(argv) {
    const process = Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
    return new Promise((resolve, reject) => {
        process.wait_check_async(null, (proc, result) => {
            try {
                proc.wait_check_finish(result);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    });
}
