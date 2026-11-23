import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPendingAssistantReply,
  createEmptyProfile,
  formatProfileContextLine,
  normalizeLocation,
  validateProfileInput,
} from './airwiseLogic.ts';

test('normalizeLocation trims and collapses repeated whitespace', () => {
  assert.equal(normalizeLocation('  New   Delhi,  India  '), 'New Delhi, India');
  assert.equal(normalizeLocation('   '), '');
});

test('validateProfileInput allows optional fields to remain blank', () => {
  const empty = createEmptyProfile();
  const result = validateProfileInput(empty);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
  assert.equal(result.sanitized.location, '');
  assert.equal(result.sanitized.lifestyle, '');
  assert.equal(result.sanitized.preferredCommute, '');
  assert.equal(result.sanitized.indoorAirPurifier, '');
});

test('validateProfileInput rejects invalid numeric counts and preserves valid profile fields', () => {
  const invalid = validateProfileInput({
    location: 'Bengaluru',
    childrenInHousehold: '-1',
    seniorCitizensInHousehold: 'abc',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.childrenInHousehold);
  assert.ok(invalid.errors.seniorCitizensInHousehold);

  const valid = validateProfileInput({
    location: '  Bengaluru, India ',
    householdType: 'Apartment',
    childrenInHousehold: '1',
    seniorCitizensInHousehold: '',
    lifestyle: 'Working Professional',
    preferredCommute: 'Public Transport',
    indoorAirPurifier: 'Yes',
    commuteDepartureTime: '08:30',
    outdoorExerciseHabit: 'Morning outdoor exercise',
    ventilationPreference: 'Open during cleaner midday hours',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.sanitized.location, 'Bengaluru, India');
  assert.equal(valid.sanitized.childrenInHousehold, '1');
  assert.equal(valid.sanitized.seniorCitizensInHousehold, '');
  assert.equal(valid.sanitized.commuteDepartureTime, '08:30');
  assert.equal(valid.sanitized.outdoorExerciseHabit, 'Morning outdoor exercise');
  assert.equal(
    valid.sanitized.ventilationPreference,
    'Open during cleaner midday hours'
  );

  const badTime = validateProfileInput({ commuteDepartureTime: '25:99' });
  assert.equal(badTime.valid, false);
  assert.ok(badTime.errors.commuteDepartureTime);
});

test('formatProfileContextLine formats concise metadata without pill clutter', () => {
  const emptyLine = formatProfileContextLine(createEmptyProfile());
  assert.equal(emptyLine, 'Profile details not set yet');

  const populatedLine = formatProfileContextLine({
    ...createEmptyProfile(),
    location: 'Pune',
    lifestyle: 'Student',
    preferredCommute: 'Bicycle',
    indoorAirPurifier: 'No',
  });
  assert.equal(populatedLine, 'Pune · Student · Commute: Bicycle · Purifier: No');
});

test('buildPendingAssistantReply clearly notes pending live-data integration without fabricating readings', () => {
  const reply = buildPendingAssistantReply(
    'Can my child play outside today?',
    {
      ...createEmptyProfile(),
      location: 'Gurugram',
      childrenInHousehold: '2',
    },
    '2026-11-21T03:32:00Z'
  );
  assert.equal(reply.role, 'assistant');
  assert.equal(reply.isPendingIntegrationNotice, true);
  assert.match(reply.content, /pending/i);
  assert.match(reply.content, /Gurugram/);
  assert.match(reply.content, /Children: 2/);
});
