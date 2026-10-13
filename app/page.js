"use client";

import { useCallback, useEffect, useState } from "react";
import { dayCount, dayRange, weekday } from "@/lib/hours";
import { HOLIDAYS } from "@/lib/holidays";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_DAYS = 93;

// 일요일·공휴일은 빨강, 토요일은 파랑 (토요일이 공휴일이면 빨강)
const dayKind = (d) =>
  HOLIDAYS[d] || weekday(d) === 0 ? "red" : weekday(d) === 6 ? "blue" : "";

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function api(url, opts) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
  return data;
}

function Cell({ value, label, onCommit }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);

  async function commit() {
    const n = v === "" ? 0 : parseInt(v, 10);
    if (n === value) {
      setV(String(value));
      return;
    }
    const ok = await onCommit(n);
    if (!ok) setV(String(value));
  }

  return (
    <input
      value={v}
      inputMode="numeric"
      className={value === 0 ? "z" : ""}
      aria-label={label}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 2))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

export default function Page() {
  const [users, setUsers] = useState([]);
  const [hours, setHours] = useState({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  // 기본 기간: 이번 달
  useEffect(() => {
    const t = new Date();
    setFrom(iso(new Date(t.getFullYear(), t.getMonth(), 1)));
    setTo(iso(new Date(t.getFullYear(), t.getMonth() + 1, 0)));
  }, []);

  const valid =
    Boolean(from && to) && from <= to && dayCount(from, to) <= MAX_DAYS;

  const load = useCallback(async () => {
    if (!valid) return;
    try {
      const [u, h] = await Promise.all([
        api("/api/users"),
        api(`/api/hours?from=${from}&to=${to}`),
      ]);
      setUsers(u);
      setHours(h);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, valid]);

  useEffect(() => {
    load();
  }, [load]);

  async function addUser(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    try {
      const u = await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ name: n }),
      });
      setUsers((p) => [...p, u]);
      setName("");
    } catch (err) {
      alert(err.message);
    }
  }

  async function renameUser(u) {
    const n = prompt("새 이름을 입력하세요.", u.name)?.trim();
    if (!n || n === u.name) return;
    try {
      await api(`/api/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: n }),
      });
      setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, name: n } : x)));
    } catch (err) {
      alert(err.message);
    }
  }

  async function removeUser(u) {
    if (!confirm(`${u.name}님과 모든 근무 기록을 삭제할까요?`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: "DELETE" });
      setUsers((p) => p.filter((x) => x.id !== u.id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function setHour(userId, date, n) {
    try {
      await api("/api/hours", {
        method: "PUT",
        body: JSON.stringify({ userId, date, hours: n }),
      });
      setHours((p) => ({ ...p, [userId]: { ...p[userId], [date]: n } }));
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  }

  const days = valid ? dayRange(from, to) : [];

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>근무시간 관리</h1>
          <p className="d">
            칸에 시간(정수)을 입력하고 Enter를 누르세요. 쉬는 날(0)이 끼면 연속 근무 계산이 새로 시작됩니다.
          </p>
        </div>
        <div className="bar">
          <label>
            시작일
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            종료일
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </header>

      {!valid && from && to && (
        <p className="err">
          기간을 확인하세요. 시작일이 종료일보다 늦거나 {MAX_DAYS}일을 넘을 수 없습니다.
        </p>
      )}

      <form className="add" onSubmit={addUser}>
        <input
          placeholder="추가할 사용자 이름"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">사용자 추가</button>
      </form>

      {loading ? (
        <p className="d">불러오는 중…</p>
      ) : users.length === 0 ? (
        <p className="d">사용자가 없습니다. 위에서 이름을 입력해 추가하세요.</p>
      ) : (
        <div className="box">
          <table>
            <thead>
              <tr>
                <th className="nm">이름</th>
                {days.map((d) => {
                  const k = dayKind(d);
                  const hol = HOLIDAYS[d];
                  return (
                    <th key={d} className={k ? `h-${k}` : ""} title={hol || undefined}>
                      <span className="n">
                        {Number(d.slice(5, 7))}/{Number(d.slice(8, 10))}
                      </span>
                      <span className="w">{WD[weekday(d)]}</span>
                      <span className="h">{hol ? "공휴" : ""}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="nm">
                    <span className="who">
                      <button className="link" onClick={() => renameUser(u)} title="이름 변경">
                        {u.name}
                      </button>
                      <button className="x" onClick={() => removeUser(u)} aria-label={`${u.name} 삭제`} title="삭제">
                        ×
                      </button>
                    </span>
                  </td>
                  {days.map((d) => {
                    const k = dayKind(d);
                    const val = hours[u.id]?.[d] ?? 0;
                    return (
                      <td key={d} className={k ? `c-${k}` : ""} title={HOLIDAYS[d] || undefined}>
                        <Cell
                          value={val}
                          label={`${u.name} ${d} 근무시간`}
                          onCommit={(n) => setHour(u.id, d, n)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="note">
        <b className="sw-red" /> 일요일·공휴일 <b className="sw-blue" /> 토요일 &nbsp;|&nbsp; 이름을 누르면 변경, × 를 누르면 삭제됩니다. 입력한 값은 바로 DB에 저장돼요.
      </p>
    </div>
  );
}
