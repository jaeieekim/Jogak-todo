import '../theme.css';
import './globals.css';

export const metadata = {
  title: '조각투두',
  description: '미루고 있는 거 하나만 적어봐요',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-bg-default text-text-primary">{children}</body>
    </html>
  );
}
