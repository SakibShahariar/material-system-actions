// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
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
export function spawnCommand(argv, actionLabel = 'Action', auditCustomAction = false) {
    const safeLabel = String(actionLabel || 'Custom action')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .slice(0, 80);
    const debug = message => {
        if (auditCustomAction && GLib.getenv('MATERIAL_SYSTEM_ACTIONS_DEBUG') === '1')
            log('material-system-actions: custom action "' + safeLabel + '": ' + message);
    };
    const startedAt = GLib.get_monotonic_time();
    const elapsedMs = () => Math.max(0, Math.round((GLib.get_monotonic_time() - startedAt) / 1000));

    debug('invoked');
    let process;
    try {
        process = Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
        debug('spawn succeeded');
    } catch (error) {
        debug('spawn failed: ' + error.message);
        throw error;
    }

    const cancellable = new Gio.Cancellable();
    processTracker.track(process, cancellable);
    return new Promise((resolve, reject) => {
        try {
            process.wait_check_async(cancellable, (proc, result) => {
                processTracker.complete(proc);
                try {
                    proc.wait_check_finish(result);
                    debug('completed with exit status 0 in ' + elapsedMs() + ' ms');
                    resolve(true);
                } catch (error) {
                    if (cancellable.is_cancelled()) {
                        debug('wait cancelled after ' + elapsedMs() + ' ms');
                        resolve(false);
                    } else {
                        let outcome = 'wait failed';
                        if (proc.get_if_exited())
                            outcome = 'exited with status ' + proc.get_exit_status();
                        else if (proc.get_if_signaled())
                            outcome = 'terminated by signal ' + proc.get_term_sig();
                        debug(outcome + ' after ' + elapsedMs() + ' ms: ' + error.message);
                        reject(error);
                    }
                }
            });
        } catch (error) {
            processTracker.complete(process);
            debug('wait setup failed after ' + elapsedMs() + ' ms: ' + error.message);
            reject(error);
        }
    });
}

/** Cancel outstanding wait callbacks on disable without terminating children. */
export function cleanupProcesses() {
    return processTracker.cancelWaits();
}
