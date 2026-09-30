import '../theme.css';
import './globals.css';

export const metadata = {
  title: '조각투두',
  description: '시작해야 하는 일 하나만 적어봐요',
};

// viewportFit: 'cover' — 이게 없으면 배경이 홈 인디케이터 안전 영역까지 안 뻗어서 그 부분만
// 까맣게 비어 보인다(버튼 위치엔 영향 없음, 배경만 꽉 채움).
export const viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="bg-bg-default text-text-primary">{children}</body>
    </html>
  );
}
