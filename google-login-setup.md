# 구글 로그인 설정 가이드

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 1.2 OAuth 2.0 클라이언트 ID 생성
1. 좌측 메뉴에서 "API 및 서비스" > "사용자 인증 정보" 선택
2. "사용자 인증 정보 만들기" > "OAuth 2.0 클라이언트 ID" 선택
3. 애플리케이션 유형: "웹 애플리케이션" 선택
4. 이름: "인생관리 앱" (또는 원하는 이름)
5. 승인된 자바스크립트 원본에 다음 추가:
   - `http://localhost:3000` (로컬 개발용)
   - `https://yourdomain.com` (실제 도메인)
6. 승인된 리디렉션 URI에 다음 추가:
   - `http://localhost:3000` (로컬 개발용)
   - `https://yourdomain.com` (실제 도메인)

### 1.3 클라이언트 ID 복사
- 생성된 OAuth 2.0 클라이언트 ID를 복사

## 2. 코드 설정

### 2.1 HTML 파일 수정
`index.html` 파일에서 다음 부분을 수정:

```html
<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"  <!-- 여기에 실제 클라이언트 ID 입력 -->
     data-callback="handleCredentialResponse"
     data-auto_prompt="false">
</div>
```

### 2.2 실제 클라이언트 ID 적용 예시
```html
<div id="g_id_onload"
     data-client_id="123456789-abcdefghijklmnop.apps.googleusercontent.com"
     data-callback="handleCredentialResponse"
     data-auto_prompt="false">
</div>
```

## 3. 기능 설명

### 3.1 로그인 기능
- 구글 계정으로 간편 로그인
- 사용자 프로필 사진과 이름 표시
- JWT 토큰을 통한 안전한 인증

### 3.2 데이터 분리
- 각 사용자별로 데이터가 분리되어 저장
- 로그인하지 않은 사용자와 로그인한 사용자의 데이터 구분
- 로그아웃 시 해당 사용자의 데이터만 초기화

### 3.3 보안
- 클라이언트 사이드에서 JWT 토큰 디코딩
- 사용자 ID를 기반으로 한 데이터 키 생성
- 로컬스토리지에 사용자별 데이터 저장

## 4. 테스트 방법

### 4.1 로컬 테스트
1. 로컬 서버 실행 (예: Live Server, http-server 등)
2. 브라우저에서 `http://localhost:3000` 접속
3. 구글 로그인 버튼 클릭
4. 구글 계정으로 로그인
5. 사용자 정보 확인 및 데이터 입력 테스트

### 4.2 배포 시 주의사항
- 실제 도메인을 Google Cloud Console에 등록
- HTTPS 사용 권장
- 도메인별로 클라이언트 ID 설정

## 5. 문제 해결

### 5.1 일반적인 오류
- **"Invalid client"**: 클라이언트 ID가 잘못되었거나 도메인이 등록되지 않음
- **"Origin mismatch"**: 현재 도메인이 승인된 자바스크립트 원본에 없음
- **CORS 오류**: 도메인 설정 확인 필요

### 5.2 디버깅
- 브라우저 개발자 도구의 콘솔에서 오류 메시지 확인
- Network 탭에서 API 호출 상태 확인
- Application 탭에서 로컬스토리지 데이터 확인

## 6. 추가 기능 확장

### 6.1 서버 연동
- 백엔드 서버와 연동하여 데이터 동기화
- 사용자별 데이터베이스 저장
- 실시간 데이터 백업

### 6.2 권한 관리
- 사용자별 권한 설정
- 데이터 공유 기능
- 팀/그룹 기능

이 가이드를 따라 설정하면 구글 로그인 기능이 정상적으로 작동합니다.

