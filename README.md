# 트래블러 여행자 만들기

Mongoose Publishing **Traveller 2판** 한국어판 기반의 비공식 팬 제작 캐릭터 생성 도구입니다.

## 실행 방법

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 빌드
```

## 법적 고지

This is an **unofficial fan-made tool** and is not affiliated with or endorsed by Mongoose Publishing or Far Future Enterprises.

- **Traveller** is a registered trademark of **Far Future Enterprises**.
- Traveller Core Rulebook © 2020 **Mongoose Publishing**
- 한국어판 © 2022 **초이스 엔터테인먼트**

이 도구는 비상업적 팬 활동으로 제작되었습니다.  
"This is an unofficial Traveller fan tool created for non-commercial purposes."

## 기술 스택

- React 18 + Vite 5
- 순수 CSS (외부 UI 라이브러리 없음)
- localStorage 자동 저장

## 기능

- 6단계 위저드 (특성치 → 배경 → 전교육 → 경력 → 주기 → 완성)
- 12개 경력, 36개 직종
- 사건/사고 표 자동 처리 (38종 효과)
- 주사위 애니메이션
- 실시간 캐릭터 시트 사이드 패널
- PDF 인쇄 지원
