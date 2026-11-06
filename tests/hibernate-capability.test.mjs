// SPDX-License-Identifier: GPL-2.0-or-later

import test from 'node:test';
import assert from 'node:assert/strict';
import {isHibernateCapabilityAvailable} from '../lib/hibernate-capability.js';

test('logind affirmative and challenge results expose Hibernate', () => {
    assert.equal(isHibernateCapabilityAvailable('yes'), true);
    assert.equal(isHibernateCapabilityAvailable('challenge'), true);
});

test('logind negative, unavailable, and unknown results fail closed', () => {
    for (const value of ['no', 'na', '', 'unknown', null, undefined, 1])
        assert.equal(isHibernateCapabilityAvailable(value), false);
});
