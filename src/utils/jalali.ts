export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const JALALI_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

export const JALALI_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - div(a, b) * b;
}

/**
 * Converts a Gregorian date to Julian Day Number.
 */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/**
 * Converts a Julian Day Number to Gregorian [gy, gm, gd].
 */
function d2g(jdn: number): [number, number, number] {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return [gy, gm, gd];
}

/**
 * Computes Jalaali calendar year details using the standard 33-year / Borkowski breaks table.
 */
function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;

  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }

  return { leap, gy, march };
}

export function isJalaliLeapYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

export function d2j(jdn: number): { jy: number; jm: number; jd: number } {
  const gy = d2g(jdn)[0];
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number;
  let jd: number;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number
): { jy: number; jm: number; jd: number } {
  return d2j(g2d(gy, gm, gd));
}

export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number
): { gy: number; gm: number; gd: number } {
  const [gy, gm, gd] = d2g(j2d(jy, jm, jd));
  return { gy, gm, gd };
}

/**
 * Returns 0 for Saturday (شنبه) ... 6 for Friday (جمعه).
 */
export function getJalaliDayOfWeek(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const jsDay = new Date(gy, gm - 1, gd).getDay(); // 0=Sun ... 6=Sat
  return (jsDay + 1) % 7;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatJalaliDate(jy: number, jm: number, jd: number): string {
  return `${jy}/${pad2(jm)}/${pad2(jd)}`;
}

export function parseJalaliDate(
  dateStr: string
): { jy: number; jm: number; jd: number } | null {
  const normalized = toEnglishDigits(dateStr.trim());
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!match) return null;
  const jy = Number(match[1]);
  const jm = Number(match[2]);
  const jd = Number(match[3]);
  if (jy < 1300 || jy > 1500) return null;
  if (jm < 1 || jm > 12) return null;
  const maxDays = getJalaliMonthDays(jy, jm);
  if (jd < 1 || jd > maxDays) return null;
  return { jy, jm, jd };
}

export function isValidJalaliDate(dateStr: string): boolean {
  return parseJalaliDate(dateStr) !== null;
}

export function formatJalaliReadable(dateStr: string): string {
  const parsed = parseJalaliDate(dateStr);
  if (!parsed) return toPersianDigits(dateStr);
  const monthName = JALALI_MONTHS[parsed.jm - 1];
  return `${toPersianDigits(parsed.jd)} ${monthName} ${toPersianDigits(parsed.jy)}`;
}

export function formatJalaliWithWeekday(dateStr: string): string {
  const parsed = parseJalaliDate(dateStr);
  if (!parsed) return toPersianDigits(dateStr);
  const weekday = JALALI_WEEKDAYS[getJalaliDayOfWeek(parsed.jy, parsed.jm, parsed.jd)];
  return `${weekday}، ${formatJalaliReadable(dateStr)}`;
}

export function formatJalaliYearMonth(yearMonth: string): string {
  const normalized = toEnglishDigits(yearMonth);
  const parts = normalized.split('/');
  if (parts.length !== 2) return toPersianDigits(yearMonth);
  const jy = Number(parts[0]);
  const jm = Number(parts[1]);
  if (!jy || jm < 1 || jm > 12) return toPersianDigits(yearMonth);
  return `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

export function compareJalaliDates(a: string, b: string): number {
  const pa = parseJalaliDate(a);
  const pb = parseJalaliDate(b);
  if (!pa || !pb) return toEnglishDigits(a).localeCompare(toEnglishDigits(b));
  const ka = pa.jy * 10000 + pa.jm * 100 + pa.jd;
  const kb = pb.jy * 10000 + pb.jm * 100 + pb.jd;
  return ka - kb;
}

export function getTodayJalali(now: Date = new Date()): {
  jy: number;
  jm: number;
  jd: number;
  formatted: string;
} {
  const { jy, jm, jd } = gregorianToJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
  return { jy, jm, jd, formatted: formatJalaliDate(jy, jm, jd) };
}
