# 인생관리 앱 ✨

할일, 루틴, 성찰을 통해 삶을 체계적으로 관리하는 웹 애플리케이션입니다.

## 🌟 주요 기능

- 📅 **오늘 관리**: 할일, 루틴, 하루 성찰
- 📊 **주간 리포트**: 한 주의 성과 분석 및 인사이트
- 🏆 **월간 리포트**: 한 달의 통계 및 달성도 확인
- 🎯 **목표 설정**: 연간 목표, 월간 실천계획, 데일리 루틴
- 👨‍💼 **관리자 승인 시스템**: 관리자가 사용자를 승인하여 서비스 이용

## 🛠️ 기술 스택

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL)
- **인증**: Google OAuth 2.0
- **배포**: Vercel

## 📁 프로젝트 구조

```
인생관리앱/
├── index.html          # 메인 앱 페이지
├── admin.html          # 관리자 페이지
├── script.js           # 메인 로직
├── styles.css          # 메인 스타일
├── admin.css           # 관리자 페이지 스타일
├── google-login-setup.md    # 구글 로그인 설정 가이드
├── supabase-setup.md        # Supabase 설정 가이드
└── deployment-guide.md      # 배포 가이드
```

## 🚀 시작하기

### 1. 로컬에서 실행 (브라우저)

1. 프로젝트 폴더를 웹 서버로 열기
   - VS Code: Live Server 확장 사용
   - 또는: `python -m http.server 8000` (터미널)
2. 브라우저에서 `http://localhost:8000` 접속

### 1-1. 데스크톱 앱(Electron)으로 실행

1. 의존성 설치  
   ```bash
   npm install
   ```
2. 개발 모드 실행  
   ```bash
   npm start
   ```
   - 창을 닫으면 트레이 아이콘으로 숨겨집니다. 트레이 메뉴에서 다시 열거나 종료할 수 있습니다.
3. 설치 파일 빌드  
   ```bash
   npm run build
   ```
   - `dist/` 폴더에 Windows(NSIS) 또는 macOS(DMG) 설치본이 생성됩니다.

> ⚠️ 참고: Firebase Web Push는 HTTPS 환경에서만 동작하므로, Electron 모드에서는 자동으로 비활성화됩니다.

### 2. Supabase 설정

자세한 내용은 [`supabase-setup.md`](./supabase-setup.md) 참고

1. Supabase 프로젝트 생성
2. SQL Editor에서 테이블 생성 SQL 실행
3. `script.js`와 `admin.html`에 Supabase URL과 API 키 설정

### 3. Google OAuth 설정

자세한 내용은 [`google-login-setup.md`](./google-login-setup.md) 참고

1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
2. `index.html`에 클라이언트 ID 설정

### 4. 배포

자세한 내용은 [`deployment-guide.md`](./deployment-guide.md) 참고

**빠른 배포 (Vercel):**
1. GitHub에 코드 업로드
2. Vercel에서 저장소 연결
3. Deploy 클릭 → 완료!

## 📖 사용 가이드

### 일반 사용자
1. 구글 로그인
2. 관리자 승인 대기
3. 승인 완료 후 앱 사용 시작
4. 할일 추가, 루틴 체크, 성찰 작성

### 관리자
1. `admin.html` 페이지 접속
2. 승인 대기 중인 사용자 확인
3. 승인/거절 처리
4. 승인된 사용자 관리

## 🔐 보안

- **Row Level Security (RLS)**: Supabase에서 데이터 접근 제어
- **사용자별 데이터 분리**: 각 사용자의 데이터는 독립적으로 저장
- **관리자 승인 시스템**: 관리자가 승인한 사용자만 접근 가능

## 📝 라이선스

이 프로젝트는 개인 사용을 위한 것입니다.

## 🤝 기여

개선 사항이나 버그가 있다면 이슈를 등록해주세요!

---

**만든이**: 인생관리 앱 개발팀  
**버전**: 1.0.0


