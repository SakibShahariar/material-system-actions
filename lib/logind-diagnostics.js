// SPDX-License-Identifier: GPL-2.0-or-later

/** Classify a GDBus failure so optional logind discovery is observable. */
export function classifyDiscoveryError(error) {
    const code = Number(error?.code);
    const message = String(error?.message ?? '').toLowerCase();

    // Gio.DBusError.TIMED_OUT and SERVICE_UNKNOWN.
    if (code === 20 || message.includes('timed out') || message.includes('timeout')) return 'timeout';
    if (code === 2 || message.includes('service unknown') || message.includes('no such')) return 'unavailable';
    return 'error';
}

export function formatDiscoveryDiagnostic(name, error, durationMs) {
    const outcome = classifyDiscoveryError(error);
    const message = String(error?.message ?? 'unknown error');
    return `logind discovery ${name}: ${outcome} after ${durationMs} ms: ${message}`;
}
