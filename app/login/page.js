import AuthForm from "../AuthForm";

export const metadata = { title: "로그인 · 근무시간 관리" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
