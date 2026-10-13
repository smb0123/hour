import "./globals.css";

export const metadata = {
  title: "근무시간 관리",
  description: "7일 단위 주 52시간 근무시간 관리",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
