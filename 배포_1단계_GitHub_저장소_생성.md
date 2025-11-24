# 🚀 배포 1단계: GitHub 저장소 생성

## 📋 이 단계에서 할 일

GitHub에 프로젝트를 업로드할 저장소를 만들고 파일을 올립니다.

---

## 방법 A: Git 명령어 사용 (권장 - 자동 배포 가능)

### ✅ 준비사항
- Git이 설치되어 있어야 합니다
- GitHub 계정이 있어야 합니다

### 📝 단계별 진행

#### 1. GitHub 저장소 생성
1. [GitHub](https://github.com) 접속 → 로그인
2. 우측 상단 **"+"** 아이콘 클릭 → **"New repository"** 선택
3. 저장소 정보 입력:
   - **Repository name**: `인생관리앱` (또는 원하는 이름)
   - **Description**: `인생관리 앱 - 할일, 루틴, 성찰 관리` (선택사항)
   - **Visibility**: 
     - ✅ **Public** (무료, 누구나 볼 수 있음) - 추천
     - 또는 **Private** (코드 비공개, 필요시 유료 플랜)
   - ⚠️ **"Initialize this repository with a README" 체크하지 마세요!**
4. **"Create repository"** 클릭

#### 2. 저장소 URL 복사
- 생성된 저장소 페이지에서 **초록색 "Code" 버튼** 클릭
- HTTPS URL 복사 (예: `https://github.com/YOUR_USERNAME/인생관리앱.git`)

#### 3. 터미널에서 Git 명령어 실행
프로젝트 폴더에서 다음 명령어를 실행하세요:

```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit - 인생관리 앱"

# 브랜치 이름을 main으로 설정
git branch -M main

# GitHub 저장소 연결 (아래 URL을 위에서 복사한 실제 URL로 변경하세요!)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# GitHub에 푸시
git push -u origin main
```

#### 4. 완료 확인
- GitHub 저장소 페이지를 새로고침
- 파일들이 업로드되어 있는지 확인

---

## 방법 B: 웹에서 직접 업로드 (간단함)

### 📝 단계별 진행

#### 1. GitHub 저장소 생성
1. [GitHub](https://github.com) 접속 → 로그인
2. 우측 상단 **"+"** 아이콘 클릭 → **"New repository"** 선택
3. 저장소 정보 입력:
   - **Repository name**: `인생관리앱`
   - **Visibility**: Public 또는 Private 선택
   - ⚠️ **"Initialize this repository with a README" 체크하지 마세요!**
4. **"Create repository"** 클릭

#### 2. 파일 업로드
1. 저장소 페이지에서 **"uploading an existing file"** 링크 클릭
2. 또는 파일 탐색기에서 다음 파일들을 드래그 앤 드롭:

   **필수 파일:**
   - ✅ `index.html`
   - ✅ `script.js`
   - ✅ `styles.css`
   - ✅ `admin.html`
   - ✅ `admin.css`
   - ✅ `타이머_인생관리.html`
   - ✅ `manifest.webmanifest`
   - ✅ `timer-icon.svg`
   - ✅ `favicon.svg`
   - ✅ `firebase-messaging-sw.js`
   - ✅ `timer-service-worker.js`
   - ✅ `vercel.json`
   - ✅ `.gitignore`

   **선택 파일 (있으면):**
   - `README.md`
   - `package.json`
   - `main.js`
   - `preload.js`

   ⚠️ **업로드하지 않을 파일:**
   - `desktop.ini` (Windows 시스템 파일 - .gitignore에 의해 자동 제외됨)

3. 하단에 커밋 메시지 입력:
   ```
   Initial commit - 인생관리 앱
   ```

4. **"Commit changes"** 클릭

#### 3. 완료 확인
- 파일들이 모두 업로드되었는지 확인

---

## ✅ 1단계 완료 체크리스트

- [ ] GitHub 저장소 생성 완료
- [ ] 모든 파일 업로드 완료
- [ ] 저장소 페이지에서 파일 목록 확인 완료

---

## ⚠️ 문제 해결

### "Repository not found" 오류
- 저장소 URL이 올바른지 확인
- GitHub에 로그인되어 있는지 확인

### "Permission denied" 오류
- GitHub 인증이 필요할 수 있습니다
- 방법 B (웹 업로드)를 사용하세요

### 파일이 너무 많아서 업로드가 안 될 때
- 방법 A (Git 명령어)를 사용하세요
- 또는 파일을 여러 번에 나눠서 업로드

---

## 🎯 다음 단계

1단계가 완료되면 **"배포_2단계_Vercel_배포.md"** 파일을 확인하세요!




