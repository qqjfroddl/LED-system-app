# 🚀 배포 2단계: Vercel 배포

## 📋 이 단계에서 할 일

Vercel에 GitHub 저장소를 연결하여 웹앱을 배포합니다.

---

## ✅ 준비사항

- [x] GitHub 저장소 생성 완료
- [x] 파일 업로드 완료
- [ ] Vercel 계정 (지금 만들 예정)

---

## 📝 단계별 진행

### 1. Vercel 가입 및 로그인

1. [Vercel](https://vercel.com) 접속
2. **"Sign Up"** 또는 **"Log In"** 클릭
3. **"Continue with GitHub"** 선택
   - GitHub 계정으로 로그인
   - Vercel이 GitHub 저장소에 접근할 수 있도록 권한 승인

### 2. 프로젝트 배포

1. Vercel Dashboard에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 목록에서 **"-"** (또는 저장소 이름) 선택
   - 저장소 이름이 "-"로 표시될 수 있습니다
   - 또는 검색창에 저장소 이름 입력

### 3. 프로젝트 설정

다음 설정을 확인하세요:

- **Project Name**: `LED-system-app` (또는 원하는 이름)
- **Framework Preset**: **"Other"** 선택
- **Root Directory**: `./` (기본값, 변경 불필요)
- **Build Command**: 비워두기 (빌드 불필요)
- **Output Directory**: 비워두기 (기본값)
- **Install Command**: 비워두기 (의존성 없음)

### 4. 환경 변수 설정 (선택사항)

현재는 코드에 직접 API 키가 들어가 있으므로 환경 변수 설정 불필요합니다.
나중에 보안 강화 시 환경 변수로 이동 가능합니다.

### 5. 배포 실행

1. **"Deploy"** 버튼 클릭
2. 약 30초~1분 대기
3. **"Congratulations!"** 메시지와 함께 배포 완료! 🎉

### 6. 배포 URL 확인

- 배포 완료 후 **"Visit"** 버튼 클릭
- 또는 상단에 표시된 URL 클릭
- 예: `https://led-system-app-xxxxx.vercel.app`

---

## ✅ 2단계 완료 체크리스트

- [ ] Vercel 계정 생성 완료
- [ ] GitHub 저장소 연결 완료
- [ ] 프로젝트 배포 완료
- [ ] 배포 URL 확인 완료

---

## ⚠️ 문제 해결

### "Repository not found" 오류
- GitHub 저장소가 Public인지 확인
- Vercel이 GitHub 저장소에 접근 권한이 있는지 확인

### 배포 실패
- Vercel Dashboard → Deployments 탭에서 에러 로그 확인
- `vercel.json` 파일이 올바른지 확인

### 404 오류 (페이지를 찾을 수 없음)
- Vercel Dashboard → Settings → General
- **"Clean URLs"** 또는 **"Trailing Slash"** 설정 확인

---

## 🎯 다음 단계

2단계가 완료되면 **"배포_3단계_Google_OAuth_설정.md"** 파일을 확인하세요!

---

## 📝 배포 후 접근 URL

배포가 완료되면 다음 URL로 접근할 수 있습니다:

- **인생관리 앱**: `https://your-app.vercel.app/index.html`
- **타이머 앱**: `https://your-app.vercel.app/타이머_인생관리.html`



