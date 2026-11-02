// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio';
import {ProcessTracker} from './process-tracker.js';

/**
 * Spawn an argv command and resolve only when it exits successfully.
 * Synchronous spawn errors are thrown; non-zero exit and wait errors reject.
 */
const processTracker = new ProcessTracker();

/**
 * Spawn an argv command and resolve only when it exits successfully.
 * Synchronous spawn errors are thrown; non-zero exit and wait errors reject.
 * The cancellable tracks only our wait operation, never the child process.
 */
export function spawnCommand(argv) {
    const process = Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
    const cancellable = new Gio.Cancellable();
    processTracker.track(process, cancellable);
    return new Promise((resolve, reject) => {
        try {
            process.wait_check_async(cancellable, (proc, result) => {
                processTracker.complete(proc);
                try {
                    proc.wait_check_finish(result);
                    resolve(true);
                } catch (error) {
                    if (cancellable.is_cancelled())
                        resolve(false);
                    else
                        reject(error);
                }
            });
        } catch (error) {
            processTracker.complete(process);
            reject(error);
        }
    });
}

/** Cancel outstanding wait callbacks on disable without terminating children. */
export function cleanupProcesses() {
    return processTracker.cancelWaits();
}
