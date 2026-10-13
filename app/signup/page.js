import AuthForm from "../AuthForm";

export const metadata = { title: "회원가입 · 근무시간 관리" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
