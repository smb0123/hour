export const LIMIT = 52;

export function isDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDays(s, n) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayRange(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function dayCount(from, to) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
}

export function weekday(date) {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

// 쉬는 날(0)이 나오면 구간이 끊기는 규칙.
// 방금 바꾼 날짜(date)가 속한 연속 근무 구간에서, 그 날짜를 포함하는
// 7일 창(구간이 7일 미만이면 구간 전체)의 최대 합계를 돌려준다.
export function worstAround(map, date) {
  const h = (d) => map[d] || 0;
  if (h(date) <= 0) return { sum: 0, start: date, end: date };

  let a = date;
  while (h(addDays(a, -1)) > 0) a = addDays(a, -1);
  let b = date;
  while (h(addDays(b, 1)) > 0) b = addDays(b, 1);

  const run = dayRange(a, b);
  const idx = run.indexOf(date);
  const len = Math.min(7, run.length);
  let best = { sum: 0, start: date, end: date };

  const kFrom = Math.max(0, idx - len + 1);
  const kTo = Math.min(idx, run.length - len);
  for (let k = kFrom; k <= kTo; k++) {
    let s = 0;
    for (let m = k; m < k + len; m++) s += h(run[m]);
    if (s > best.sum) best = { sum: s, start: run[k], end: run[k + len - 1] };
  }
  return best;
}
