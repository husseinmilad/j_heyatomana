import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareJalaliDates,
  formatJalaliReadable,
  formatJalaliWithWeekday,
  getJalaliDayOfWeek,
  getJalaliMonthDays,
  gregorianToJalali,
  isJalaliLeapYear,
  isValidJalaliDate,
  jalaliToGregorian,
  parseJalaliDate,
  toEnglishDigits,
  toPersianDigits,
} from './jalali';

test('gregorianToJalali converts known dates accurately including 2026-11-16', () => {
  // 2026-11-16 -> 1405/08/25 (25 Aban 1405)
  assert.deepEqual(gregorianToJalali(2026, 11, 16), { jy: 1405, jm: 8, jd: 25 });
  // 2025-03-21 -> 1404/01/01 (Nowruz 1404)
  assert.deepEqual(gregorianToJalali(2025, 3, 21), { jy: 1404, jm: 1, jd: 1 });
  // 2024-03-20 -> 1403/01/01 (Nowruz 1403 - 1403 is leap year)
  assert.deepEqual(gregorianToJalali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 });
  // 2025-03-20 -> 1403/12/30 (Esfand 30 of leap year 1403)
  assert.deepEqual(gregorianToJalali(2025, 3, 20), { jy: 1403, jm: 12, jd: 30 });
});

test('jalaliToGregorian round-trips accurately', () => {
  assert.deepEqual(jalaliToGregorian(1405, 8, 25), { gy: 2026, gm: 11, gd: 16 });
  assert.deepEqual(jalaliToGregorian(1403, 12, 30), { gy: 2025, gm: 3, gd: 20 });
});

test('Jalali leap year and month day counts work properly', () => {
  assert.equal(isJalaliLeapYear(1403), true);
  assert.equal(isJalaliLeapYear(1404), false);
  assert.equal(isJalaliLeapYear(1405), false);
  assert.equal(getJalaliMonthDays(1403, 12), 30);
  assert.equal(getJalaliMonthDays(1404, 12), 29);
  assert.equal(getJalaliMonthDays(1405, 1), 31);
  assert.equal(getJalaliMonthDays(1405, 7), 30);
});

test('isValidJalaliDate and parseJalaliDate validate leap days and Persian digits', () => {
  assert.equal(isValidJalaliDate('1403/12/30'), true);
  assert.equal(isValidJalaliDate('1404/12/30'), false);
  assert.equal(isValidJalaliDate('۱۴۰۵/۰۸/۲۵'), true);
  assert.deepEqual(parseJalaliDate('۱۴۰۵/۰۸/۲۵'), { jy: 1405, jm: 8, jd: 25 });
  assert.equal(isValidJalaliDate('1405/13/01'), false);
});

test('weekday and readable Persian formatting', () => {
  // 2026-11-16 is Monday -> Doshanbeh (index 2 in Sat=0..Fri=6)
  assert.equal(getJalaliDayOfWeek(1405, 8, 25), 2);
  assert.equal(formatJalaliReadable('1405/08/25'), '۲۵ آبان ۱۴۰۵');
  assert.equal(formatJalaliWithWeekday('1405/08/25'), 'دوشنبه، ۲۵ آبان ۱۴۰۵');
  assert.equal(toPersianDigits('1405/08/25'), '۱۴۰۵/۰۸/۲۵');
  assert.equal(toEnglishDigits('۱۴۰۵/۰۸/۲۵'), '1405/08/25');
  assert.ok(compareJalaliDates('1405/08/25', '1405/08/21') > 0);
});
