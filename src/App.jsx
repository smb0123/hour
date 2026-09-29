import { useState } from "react";
import "./App.css";

const LIMIT = 52;
const DAYS = 35;
const WD = ["일", "월", "화", "수", "목", "금", "토"];
// 엑셀 날짜: 27, 28, 29, 30, 1, 2, ... (월 구분 없이 이어서 표시)
const DATES = Array.from({ length: DAYS }, (_, i) => (i < 4 ? 27 + i : i - 3));
const MONTHS = Array.from({ length: DAYS }, (_, i) => (i < 4 ? 9 : 10));
// 눈에 띄게 표시할 날짜 (월-일 쌍으로 지정)
const HIGHLIGHT_DATES = new Set([
  "9-27",
  "10-3", "10-4", "10-5", "10-9", "10-10", "10-11", "10-17", "10-24", "10-31",
]);
const isHighlight = (i) => HIGHLIGHT_DATES.has(`${MONTHS[i]}-${DATES[i]}`);

// 엑셀 원본 (새로고침하면 이 값으로 돌아옴)
const ORIGINAL = [
  ["최성갑", [0, 8, 11, 8, 8, 8, 0, 8, 0, 8, 8, 8, 0, 0, 0, 8, 8, 8, 8, 8, 7, 0, 8, 8, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 0]],
  ["이종호", [8, 10, 8, 8, 8, 8, 0, 0, 0, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 7]],
  ["이상진", [0, 8, 8, 8, 8, 8, 0, 0, 0, 8, 8, 8, 8, 7, 0, 8, 8, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 0]],
  ["심민보", [0, 8, 10, 8, 8, 8, 7, 0, 8, 8, 8, 8, 0, 0, 0, 8, 8, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 0, 0, 8, 8, 8, 8, 8, 0]],
];

const copyOriginal = () => ORIGINAL.map(([, v]) => v.slice());

// 쉬는 날(0)이 나오면 구간 리셋.
// 연속 근무 구간 안에서 7일씩 한 칸씩 밀며 합계 계산 (7일 미만이면 구간 전체 합계).
function worst(v) {
  let best = { sum: 0, start: 0, end: 0 };
  let i = 0;
  while (i < v.length) {
    if (v[i] <= 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < v.length && v[j] > 0) j++;
    const len = Math.min(7, j - i);
    for (let k = i; k + len <= j; k++) {
      let s = 0;
      for (let m = k; m < k + len; m++) s += v[m];
      if (s > best.sum) best = { sum: s, start: k, end: k + len - 1 };
    }
    i = j;
  }
  return best;
}

export default function App() {
  const [rows, setRows] = useState(copyOriginal);

  function change(r, c, raw) {
    const digits = String(raw).replace(/\D/g, ""); // 소수점·문자 입력 차단
    const n = digits === "" ? 0 : parseInt(digits, 10);

    if (n > 24) {
      alert("하루 근무시간은 24시간을 넘을 수 없습니다.");
      return;
    }

    const next = rows[r].slice();
    next[c] = n;
    const w = worst(next);

    if (w.sum > LIMIT) {
      alert(
        `⚠ 주 52시간 초과\n\n${ORIGINAL[r][0]}님 ${DATES[w.start]}일~${DATES[w.end]}일 근무시간 합계가 ${w.sum}시간입니다.\n(52시간 이하만 입력할 수 있습니다.)`
      );
      return; // 입력 취소 (이전 값 유지)
    }
    setRows(rows.map((x, i) => (i === r ? next : x)));
  }

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>근무시간 관리</h1>
          <p className="d">
            칸을 눌러 시간(정수)을 수정하세요. 쉬는 날(0)이 끼면 연속 근무 계산이 새로 시작됩니다.
          </p>
        </div>
        <button onClick={() => setRows(copyOriginal())}>엑셀 값으로 되돌리기</button>
      </header>

      <div className="box">
        <table>
          <thead>
            <tr>
              <th className="nm">이름</th>
              {DATES.map((d, i) => {
                const weekCls = i % 7 === 0 ? "sun" : i % 7 === 6 ? "sat" : "";
                const hlCls = isHighlight(i) ? " hl" : "";
                return (
                  <th key={i} className={weekCls + hlCls}>
                    <span className="n">{MONTHS[i]}/{d}</span>
                    <span className="w">{WD[i % 7]}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((v, r) => {
              const w = worst(v).sum;
              return (
                <tr key={ORIGINAL[r][0]}>
                  <td className="nm">{ORIGINAL[r][0]}</td>
                  {v.map((n, c) => {
                    const weekend = c % 7 === 0 || c % 7 === 6;
                    const edited = n !== ORIGINAL[r][1][c];
                    const hl = isHighlight(c);
                    return (
                      <td key={c} className={`${weekend ? "we " : ""}${hl ? "hl " : ""}${edited ? "ed" : ""}`}>
                        <input
                          value={n}
                          inputMode="numeric"
                          className={n === 0 ? "z" : ""}
                          aria-label={`${ORIGINAL[r][0]} ${MONTHS[c]}월 ${DATES[c]}일 근무시간`}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => change(r, c, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
