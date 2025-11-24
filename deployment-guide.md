# 배포 가이드 - Vercel

## 📋 배포 전 체크리스트

### 1. 데이터베이스 확인
- [ ] Supabase 프로젝트 생성 완료
- [ ] 모든 테이블 생성 확인 (users, user_data, monthly_routines, yearly_goals, monthly_plans)
- [ ] RLS 정책 설정 완료
- [ ] 관리자 UPDATE/DELETE 정책 추가 완료

### 2. 코드 확인
- [ ] `script.js`의 Supabase URL과 API 키 설정됨
- [ ] `admin.html`의 Supabase URL과 API 키 설정됨
- [ ] Google OAuth 클라이언트 ID 설정됨

---

## 🚀 Vercel 배포 단계별 가이드

### 1단계: GitHub 저장소 생성 (5분)

#### 1.1 GitHub 저장소 생성
1. [GitHub](https://github.com) 접속 → 로그인
2. 우측 상단 **"+"** 아이콘 클릭 → **"New repository"** 선택
3. 저장소 정보 입력:
   - **Repository name**: `인생관리앱` (또는 원하는 이름)
   - **Description**: `인생관리 앱 - 할일, 루틴, 성찰 관리` (선택사항)
   - **Visibility**: 
     - Public (무료, 누구나 볼 수 있음)
     - Private (코드 비공개, 필요시 유료 플랜)
   - ⚠️ **"Initialize this repository with a README" 체크하지 마세요!** (이미 파일이 있으므로)
4. **"Create repository"** 클릭

#### 1.2 파일 업로드 (방법 1: 웹에서 직접)

1. 생성된 저장소 페이지에서 **"uploading an existing file"** 링크 클릭
2. 또는 직접 드래그 앤 드롭 가능
3. 다음 파일들만 업로드:
   ```
   ✅ index.html
   ✅ script.js
   ✅ styles.css
   ✅ admin.html
   ✅ admin.css
   ✅ google-login-setup.md
   ✅ supabase-setup.md
   ✅ deployment-guide.md (이 파일)
   ✅ .gitignore
   ✅ vercel.json
   ```
   ⚠️ **업로드하지 않을 파일:**
   - `desktop.ini` (Windows 시스템 파일)

4. 하단에 커밋 메시지 입력:
   ```
   Initial commit - 인생관리 앱
   ```
5. **"Commit changes"** 클릭

#### 1.3 파일 업로드 (방법 2: Git 명령어 - 고급)

터미널에서 프로젝트 폴더로 이동 후:

```bash
# Git 초기화
git init

# 모든 파일 추가 (desktop.ini는 .gitignore에 의해 자동 제외됨)
git add .

# 첫 커밋
git commit -m "Initial commit - 인생관리 앱"

# 브랜치 이름을 main으로 변경
git branch -M main

# GitHub 저장소 연결 (YOUR_USERNAME과 YOUR_REPO_NAME을 실제 값으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# GitHub에 푸시
git push -u origin main
```

---

### 2단계: Vercel 배포 (5분)

#### 2.1 Vercel 가입
1. [Vercel](https://vercel.com) 접속
2. **"Sign Up"** 클릭
3. **"Continue with GitHub"** 선택 (GitHub 계정으로 로그인)
4. 권한 승인 (Vercel이 GitHub 저장소에 접근할 수 있도록)

#### 2.2 프로젝트 배포
1. Vercel Dashboard에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 목록에서 방금 생성한 **"인생관리앱"** 저장소 선택
3. 또는 검색창에 저장소 이름 입력 후 선택

#### 2.3 프로젝트 설정
1. **Project Name**: `인생관리앱` (자동으로 채워짐)
2. **Framework Preset**: **"Other"** 선택 (또는 "Vite" - 상관없음)
3. **Root Directory**: `./` (기본값, 변경 불필요)
4. **Build Command**: 비워두기 (빌드 불필요)
5. **Output Directory**: 비워두기 (기본값)
6. **Install Command**: 비워두기 (의존성 없음)

#### 2.4 환경 변수 설정 (선택사항)
- 현재는 코드에 직접 API 키가 들어가 있으므로 환경 변수 설정 불필요
- 나중에 보안 강화 시 환경 변수로 이동 가능

#### 2.5 배포 실행
1. **"Deploy"** 버튼 클릭
2. 약 30초~1분 대기
3. **"Congratulations!"** 메시지와 함께 배포 완료! 🎉

#### 2.6 배포 URL 확인
- 배포 완료 후 **"Visit"** 버튼 클릭
- 또는 상단에 표시된 URL 클릭
- 예: `https://인생관리앱-xxxxx.vercel.app`

---

### 3단계: Google OAuth 설정 업데이트 (5분)

배포된 도메인을 Google OAuth에 추가해야 합니다.

#### 3.1 Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 좌측 메뉴: **"API 및 서비스"** → **"사용자 인증 정보"**
3. 기존 OAuth 2.0 클라이언트 ID 클릭 (편집)

#### 3.2 승인된 자바스크립트 원본 추가
**"승인된 자바스크립트 원본"** 섹션에 다음 추가:
```
https://your-project.vercel.app
```
또는
```
https://인생관리앱-xxxxx.vercel.app
```
(Vercel에서 제공한 실제 URL)

기존 `http://localhost:3000`은 개발용이므로 그대로 두기

#### 3.3 승인된 리디렉션 URI 추가
**"승인된 리디렉션 URI"** 섹션에도 동일한 URL 추가:
```
https://your-project.vercel.app
```

#### 3.4 저장
**"저장"** 버튼 클릭

---

### 4단계: 배포 확인 및 테스트

#### 4.1 기본 기능 테스트
1. 배포된 URL 접속
2. 구글 로그인 시도
3. "승인 대기 중" 메시지 확인 (정상!)
4. 관리자 페이지 접속: `https://your-project.vercel.app/admin.html`

#### 4.2 관리자 기능 테스트
1. `admin.html`에서 승인 대기 사용자 확인
2. 승인 버튼 클릭 → 작동 확인
3. 승인된 사용자로 다시 로그인 → 앱 사용 가능 확인

#### 4.3 데이터 저장 테스트
1. 할일 추가
2. 루틴 체크
3. 성찰 작성
4. 페이지 새로고침 → 데이터 유지 확인

---

## 🔄 업데이트 배포

코드를 수정한 후 다시 배포하려면:

### 방법 1: GitHub 푸시 시 자동 배포 (권장)
1. 파일 수정
2. Git 커밋 및 푸시:
   ```bash
   git add .
   git commit -m "업데이트 내용"
   git push
   ```
3. Vercel이 자동으로 감지하여 재배포 (약 1분)

### 방법 2: Vercel Dashboard에서 수동 재배포
1. Vercel Dashboard 접속
2. 프로젝트 선택
3. **"Deployments"** 탭
4. 최신 배포의 **"..."** 메뉴 → **"Redeploy"**

---

## 🔧 문제 해결

### "Invalid client" 오류
- Google OAuth 설정에서 배포된 도메인이 추가되었는지 확인
- 브라우저 콘솔(F12)에서 에러 메시지 확인

### Supabase 연결 오류
- `script.js`와 `admin.html`의 Supabase URL과 API 키 확인
- Supabase Dashboard에서 프로젝트가 활성 상태인지 확인

### 404 오류 (페이지를 찾을 수 없음)
- Vercel Dashboard → Settings → General
- **"Clean URLs"** 또는 **"Trailing Slash"** 설정 확인

### 관리자 페이지 접근 불가
- URL: `https://your-project.vercel.app/admin.html` 직접 접속
- 또는 `index.html`에서 관리자 페이지 링크 추가

---

## 📝 커스텀 도메인 설정 (선택사항)

### 1. Vercel에서 도메인 추가
1. Vercel Dashboard → 프로젝트 선택
2. **Settings** → **Domains**
3. 원하는 도메인 입력 (예: `life-manager.com`)
4. DNS 설정 안내 따라하기

### 2. Google OAuth에 커스텀 도메인 추가
- 커스텀 도메인도 Google Cloud Console에 추가 필요

---

## ✅ 배포 완료 체크리스트

- [ ] GitHub 저장소 생성 및 파일 업로드 완료
- [ ] Vercel 배포 완료
- [ ] 배포 URL 확인 (`https://xxx.vercel.app`)
- [ ] Google OAuth에 배포 URL 추가 완료
- [ ] 구글 로그인 테스트 완료
- [ ] 관리자 페이지 접속 확인
- [ ] 사용자 승인 기능 테스트 완료
- [ ] 데이터 저장/로드 테스트 완료

---

## 🎉 배포 완료!

축하합니다! 이제 전 세계 어디서나 접속 가능한 인생관리 앱이 준비되었습니다!

**다음 단계:**
- 사용자들에게 앱 URL 공유
- 관리자 페이지에서 신규 사용자 승인
- 필요시 커스텀 도메인 설정

---

## 📞 추가 도움

배포 중 문제가 발생하면:
1. Vercel Dashboard의 **"Deployments"** 탭에서 에러 로그 확인
2. 브라우저 개발자 도구(F12) → Console 탭에서 에러 확인
3. Supabase Dashboard에서 테이블 및 정책 확인


