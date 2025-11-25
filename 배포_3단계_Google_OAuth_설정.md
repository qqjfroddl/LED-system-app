# 🚀 배포 3단계: Google OAuth 설정 업데이트

## 📋 이 단계에서 할 일

배포된 도메인을 Google OAuth에 추가하여 배포된 사이트에서도 Google 로그인이 작동하도록 설정합니다.

---

## ✅ 준비사항

- [x] GitHub 저장소 생성 완료
- [x] Vercel 배포 완료
- [x] 배포 URL 확인: `https://led-system-app-6jvn.vercel.app`

---

## 📝 단계별 진행

### 1. Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 로그인

### 2. OAuth 2.0 클라이언트 ID 편집

1. 좌측 메뉴: **"API 및 서비스"** → **"사용자 인증 정보"** 클릭
2. **"인생관리 앱"** OAuth 2.0 클라이언트 ID 찾기
3. 클라이언트 ID 옆의 **연필 아이콘(편집)** 클릭

### 3. 승인된 자바스크립트 원본에 추가

**"승인된 자바스크립트 원본"** 섹션에서:
1. **"+ URI 추가"** 버튼 클릭
2. 다음 URL 추가:
   ```
   https://led-system-app-6jvn.vercel.app
   ```
3. 기존 URL들(`http://localhost:5500`, `http://127.0.0.1:5500`)은 그대로 유지

### 4. 승인된 리디렉션 URI에 추가

**"승인된 리디렉션 URI"** 섹션에서:
1. **"+ URI 추가"** 버튼 클릭
2. 동일한 URL 추가:
   ```
   https://led-system-app-6jvn.vercel.app
   ```
3. 기존 URL들도 그대로 유지

### 5. 저장

1. 화면 하단의 **"저장"** 버튼 클릭
2. 저장 완료 메시지 확인

### 6. 테스트

1. 배포된 사이트 접속: https://led-system-app-6jvn.vercel.app
2. Google 로그인 버튼 클릭
3. 정상 작동 확인

---

## ✅ 3단계 완료 체크리스트

- [ ] Google Cloud Console 접속 완료
- [ ] OAuth 클라이언트 ID 편집 완료
- [ ] 승인된 자바스크립트 원본에 배포 URL 추가 완료
- [ ] 승인된 리디렉션 URI에 배포 URL 추가 완료
- [ ] 저장 완료
- [ ] 배포된 사이트에서 Google 로그인 테스트 완료

---

## ⚠️ 문제 해결

### "Invalid client" 오류
- Google OAuth 설정에서 배포된 도메인이 추가되었는지 확인
- 브라우저 콘솔(F12)에서 에러 메시지 확인
- 저장 후 몇 분 기다려보기 (설정 반영 시간)

### 로그인은 되는데 데이터가 안 보여
- Supabase 연결 확인
- 브라우저 콘솔에서 Supabase 연결 메시지 확인

---

## 🎯 다음 단계

3단계가 완료되면 **"배포_4단계_배포_확인_및_테스트.md"** 파일을 확인하세요!

---

## 📝 배포 URL 정보

- **메인 URL**: https://led-system-app-6jvn.vercel.app
- **인생관리 앱**: https://led-system-app-6jvn.vercel.app/index.html
- **타이머 앱**: https://led-system-app-6jvn.vercel.app/타이머_인생관리.html



