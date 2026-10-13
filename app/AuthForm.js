"use client";

import { useState } from "react";
import Link from "next/link";

export default function AuthForm({ mode }) {
  const signup = mode === "signup";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (signup && password !== password2) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form onSubmit={submit}>
        <h1>{signup ? "회원가입" : "로그인"}</h1>
        <p className="d">근무시간 관리</p>

        <label>
          아이디
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            placeholder={signup ? "영문 소문자, 숫자, _ (3~20자)" : ""}
            required
          />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder={signup ? "8자 이상" : ""}
            required
          />
        </label>
        {signup && (
          <>
            <label>
              비밀번호 확인
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              가입 코드
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                placeholder="관리자에게 받은 코드"
                required
              />
            </label>
          </>
        )}

        {error && <p className="err" role="alert">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "처리 중…" : signup ? "가입하기" : "로그인"}
        </button>

        <p className="alt">
          {signup ? (
            <>이미 계정이 있나요? <Link href="/login">로그인</Link></>
          ) : (
            <>계정이 없나요? <Link href="/signup">회원가입</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
