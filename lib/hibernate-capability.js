// SPDX-License-Identifier: GPL-2.0-or-later

/** logind's CanHibernate result: "yes", "no", "challenge", or "na". */
export function isHibernateCapabilityAvailable(value) {
    return value === 'yes' || value === 'challenge';
}
