import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSessionDuration,
  COMMITTEES,
  computeCommitteeStats,
  computeMonthlyTrend,
  computeRepresentativeStats,
  computeTrusteeStats,
  decodeSharePayload,
  encodeSharePayload,
  filterSessions,
  formatMinutesToPersian,
  getEffectiveTrusteeId,
  parseAndValidateBackup,
  serializeBackup,
  validateSessionInput,
} from './analytics';
import { INITIAL_SEED_STATE } from '../data/seedData';

test('COMMITTEES contains the 4 core committees and consolidation', () => {
  const names = COMMITTEES.map((c) => c.name);
  assert.deepEqual(names, [
    'حسابرسی و بودجه',
    'اقتصاد و سرمایه گذاری',
    'بیمه و محاسبات اکچوئری',
    'بهداشت و درمان',
    'تلفیق',
  ]);
});

test('Extracted PDF dataset includes all 12 trustees and 32 people', () => {
  assert.equal(INITIAL_SEED_STATE.trustees.length, 12);
  assert.equal(INITIAL_SEED_STATE.representatives.length, 32);

  const heydari = INITIAL_SEED_STATE.representatives.find(
    (r) => r.fullName === 'سید علیرضا حیدری'
  );
  assert.ok(heydari);
  assert.equal(heydari.trusteeId, 'tr-mahjoub');
  assert.deepEqual(heydari.committeeIds, ['audit-budget']);

  // Dual-committee trustee override for عیسی شیرزاده
  const shirzadeh = INITIAL_SEED_STATE.representatives.find(
    (r) => r.fullName === 'عیسی شیرزاده'
  );
  assert.ok(shirzadeh);
  assert.equal(getEffectiveTrusteeId(shirzadeh, 'consolidation'), 'tr-seifi');
  assert.equal(
    getEffectiveTrusteeId(shirzadeh, 'insurance-actuarial'),
    'tr-bayat'
  );
});

test('calculateSessionDuration and formatMinutesToPersian compute correctly', () => {
  assert.equal(calculateSessionDuration('09:00', '11:30'), 150);
  assert.equal(calculateSessionDuration('14:00', '13:30'), null);
  assert.equal(calculateSessionDuration('10:00', '10:00'), null);
  assert.equal(formatMinutesToPersian(150), '۲ ساعت و ۳۰ دقیقه');
  assert.equal(formatMinutesToPersian(120), '۲ ساعت');
  assert.equal(formatMinutesToPersian(45), '۴۵ دقیقه');
});

test('validateSessionInput rejects invalid dates, times, topics, and empty attendees', () => {
  const invalid = validateSessionInput({
    committeeId: '',
    jalaliDate: '1405/12/30',
    startTime: '12:00',
    endTime: '11:00',
    topic: 'ا',
    reportSummary: '',
    attendees: [],
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.committeeId);
  assert.ok(invalid.errors.jalaliDate);
  assert.ok(invalid.errors.endTime);
  assert.ok(invalid.errors.topic);
  assert.ok(invalid.errors.attendees);

  const valid = validateSessionInput({
    committeeId: 'audit-budget',
    jalaliDate: '1405/08/25',
    startTime: '09:00',
    endTime: '11:00',
    topic: 'بررسی بودجه سالانه',
    reportSummary: 'گزارش تصویب شد.',
    attendees: [{ representativeId: 'rep-heydari' }],
  });
  assert.equal(valid.valid, true);
});

test('computeRepresentativeStats and computeTrusteeStats handle overrides and independent coordinators accurately', () => {
  const { sessions, representatives, trustees } = INITIAL_SEED_STATE;
  const repStats = computeRepresentativeStats(sessions, representatives, trustees);

  // سید علیرضا حیدری attends ses-pdf-1 (180m), ses-pdf-2 (240m), ses-pdf-7 (120m) => 3 sessions, 540 mins
  const heydariStat = repStats.find(
    (r) => r.representative.id === 'rep-heydari'
  );
  assert.ok(heydariStat);
  assert.equal(heydariStat.sessionCount, 3);
  assert.equal(heydariStat.totalMinutes, 540);

  const trusteeStats = computeTrusteeStats(sessions, trustees, representatives);
  // بیات gets عیسی شیرزاده in ses-pdf-3 (120m) & ses-pdf-4 (120m) + محمد اسدی in ses-pdf-6 (240m) = 3 sessions, 480 mins
  const bayatStat = trusteeStats.find((t) => t.trustee.id === 'tr-bayat');
  assert.ok(bayatStat);
  assert.equal(bayatStat.sessionCount, 3);
  assert.equal(bayatStat.totalMinutes, 480);
});

test('computeCommitteeStats and computeMonthlyTrend aggregate accurately', () => {
  const committeeStats = computeCommitteeStats(INITIAL_SEED_STATE.sessions);
  const consolidation = committeeStats.find(
    (c) => c.committee.id === 'consolidation'
  );
  assert.ok(consolidation);
  assert.equal(consolidation.sessionCount, 2);
  assert.equal(consolidation.totalSessionMinutes, 420); // 180 + 240

  const trend = computeMonthlyTrend(INITIAL_SEED_STATE.sessions);
  assert.equal(trend.length, 5); // Tir, Mordad, Shahrivar, Mehr, Aban
});

test('filterSessions filters by committee, trustee override, and date range', () => {
  const { sessions, representatives } = INITIAL_SEED_STATE;
  const onlyHealthcare = filterSessions(
    sessions,
    {
      searchQuery: '',
      committeeId: 'healthcare',
      trusteeId: 'all',
      representativeId: 'all',
      dateFrom: '',
      dateTo: '',
    },
    representatives
  );
  assert.equal(onlyHealthcare.length, 1);
  assert.equal(onlyHealthcare[0].id, 'ses-pdf-8');

  // Filtering by بیات should match ses-pdf-3, ses-pdf-4 (via شیرزاده insurance override) and ses-pdf-6 (via اسدی)
  const onlyBayat = filterSessions(
    sessions,
    {
      searchQuery: '',
      committeeId: 'all',
      trusteeId: 'tr-bayat',
      representativeId: 'all',
      dateFrom: '',
      dateTo: '',
    },
    representatives
  );
  assert.equal(onlyBayat.length, 3);
});

test('backup serialize/parse and share payload encode/decode round-trip safely', () => {
  const json = serializeBackup(INITIAL_SEED_STATE);
  const parsed = parseAndValidateBackup(json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.sessions.length, INITIAL_SEED_STATE.sessions.length);
    assert.equal(parsed.data.trustees.length, 12);
    assert.equal(parsed.data.representatives.length, 32);
  }

  const bad = parseAndValidateBackup('{"invalid": true}');
  assert.equal(bad.ok, false);

  const encoded = encodeSharePayload(INITIAL_SEED_STATE);
  const decoded = decodeSharePayload(encoded);
  assert.ok(decoded);
  assert.equal(decoded.representatives.length, 32);
});
