# EmailJS 이메일 알림 설정 가이드

## 📧 이메일 알림 기능

사용자가 신청할 때 자동으로 이메일이 발송됩니다:
- **사용자에게**: 승인 대기 안내 이메일
- **관리자에게**: 신규 신청 알림 이메일

---

## 1단계: EmailJS 계정 생성

1. [EmailJS](https://www.emailjs.com) 접속
2. "Sign Up" 클릭하여 무료 계정 생성
3. 이메일 인증 완료

---

## 2단계: 이메일 서비스 연결

1. EmailJS Dashboard 접속
2. 좌측 메뉴에서 **"Email Services"** 클릭
3. **"Add New Service"** 클릭
4. 사용할 이메일 서비스 선택 (Gmail, Outlook, SMTP 등)
   - **Gmail 추천**: 설정이 가장 간단

### Gmail 연결 방법:
1. "Gmail" 선택
2. "Connect Account" 클릭
3. Google 계정으로 로그인 및 권한 승인
4. 연결 완료 후 **Service ID** 복사 (예: `service_abc123`)

---

## 3단계: 이메일 템플릿 생성

### 3.1 사용자용 템플릿 (승인 대기 안내)

1. 좌측 메뉴에서 **"Email Templates"** 클릭
2. **"Create New Template"** 클릭
3. 템플릿 설정:

**템플릿 이름**: `user_registration_notification`

**Subject (제목)**:
```
인생관리 앱 가입 신청 완료
```

**Content (내용)**:
```html
안녕하세요, {{to_name}}님!

인생관리 앱 가입 신청이 접수되었습니다.

📋 가입 정보
- 이름: {{user_name}}
- 이메일: {{user_email}}
- 신청일시: {{requested_at}}

⏳ 승인 대기 중
현재 관리자 승인 대기 중입니다. 승인이 완료되면 로그인하여 서비스를 이용하실 수 있습니다.
보통 24시간 이내에 처리됩니다.

📧 문의사항
문의사항이 있으시면 아래 이메일로 연락해주세요.
{{admin_email}}

감사합니다.
인생관리 앱 팀
```

**변수 설정**: 템플릿에서 사용할 변수는 자동으로 인식됩니다
- `{{to_name}}`: 사용자 이름
- `{{to_email}}`: 사용자 이메일
- `{{user_name}}`: 사용자 이름
- `{{user_email}}`: 사용자 이메일
- `{{requested_at}}`: 신청일시
- `{{admin_email}}`: 관리자 이메일

4. **"Save"** 클릭
5. **Template ID** 복사 (예: `template_xyz789`)

### 3.2 관리자용 템플릿 (신규 신청 알림)

1. **"Create New Template"** 다시 클릭
2. 템플릿 설정:

**템플릿 이름**: `admin_registration_notification`

**To Email (받는 사람)**: `ledhelper@daum.net`

**Subject (제목)**:
```
[인생관리 앱] 신규 사용자 가입 신청 알림
```

**Content (내용)**:
```html
안녕하세요, 관리자님!

새로운 사용자가 인생관리 앱에 가입을 신청했습니다.

👤 신청자 정보
- 이름: {{user_name}}
- 이메일: {{user_email}}
- 신청일시: {{requested_at}}

✅ 승인하기
아래 링크에서 관리자 페이지로 이동하여 승인해주세요:
{{admin_url}}

감사합니다.
인생관리 앱 시스템
```

**변수 설정**:
- `{{to_name}}`: 관리자
- `{{to_email}}`: 관리자 이메일
- `{{user_name}}`: 신청자 이름
- `{{user_email}}`: 신청자 이메일
- `{{requested_at}}`: 신청일시
- `{{admin_url}}`: 관리자 페이지 URL

3. **"Save"** 클릭
4. **Template ID** 복사 (예: `template_admin123`)

---

## 4단계: Public Key 가져오기

1. 좌측 메뉴에서 **"Account"** 클릭
2. **"General"** 탭에서 **"Public Key"** 복사 (예: `abcdefghijklmnop`)

---

## 5단계: 코드에 설정 적용

`script.js` 파일에서 다음 값들을 실제 값으로 변경하세요:

```javascript
const EMAILJS_SERVICE_ID = 'service_abc123';  // 2단계에서 복사한 Service ID
const EMAILJS_TEMPLATE_ID_USER = 'template_xyz789';  // 3.1에서 복사한 사용자 템플릿 ID
const EMAILJS_TEMPLATE_ID_ADMIN = 'template_admin123';  // 3.2에서 복사한 관리자 템플릿 ID
const EMAILJS_PUBLIC_KEY = 'abcdefghijklmnop';  // 4단계에서 복사한 Public Key
```

---

## 6단계: 테스트

1. 테스트 사용자로 로그인 시도
2. 신규 등록 시 콘솔에서 확인:
   - `✅ 사용자 이메일 발송 완료`
   - `✅ 관리자 이메일 발송 완료`
3. 실제 이메일 수신 확인

---

## 무료 플랜 제한사항

EmailJS 무료 플랜:
- **월 200통**까지 무료
- **월 200통 초과 시**: 유료 플랜 ($15/월) 필요

---

## 문제 해결

### 이메일이 발송되지 않는 경우

1. **콘솔 확인**: 브라우저 개발자 도구(F12) → Console 탭에서 에러 확인
2. **EmailJS 설정 확인**:
   - Service ID가 올바른지 확인
   - Template ID가 올바른지 확인
   - Public Key가 올바른지 확인
3. **템플릿 변수 확인**: 템플릿에 사용된 변수명이 코드와 일치하는지 확인
4. **이메일 서비스 연결 확인**: EmailJS Dashboard → Email Services에서 연결 상태 확인

### "Invalid template" 오류
- Template ID가 잘못되었거나 템플릿이 삭제됨
- EmailJS Dashboard에서 Template ID 재확인

### "Service not found" 오류
- Service ID가 잘못되었거나 서비스가 삭제됨
- EmailJS Dashboard에서 Service ID 재확인

### 이메일이 스팸함에 있는 경우
- Gmail의 경우 처음에는 스팸함에 들어갈 수 있음
- "스팸 아님" 표시 후 다음부터는 받은편지함으로 옴

---

## 보안 참고사항

⚠️ **주의**: `script.js`에 EmailJS 설정이 노출됩니다. 이는 프론트엔드에서 공개적으로 접근 가능하므로:

1. **Public Key는 공개되어도 안전** (EmailJS 설계상)
2. **민감한 정보는 템플릿에 포함하지 마세요**
3. **Rate Limiting 설정**: EmailJS Dashboard → Rate Limits에서 악용 방지 설정

---

## 추가 기능

### 승인 완료 이메일 (선택사항)

사용자가 승인되었을 때도 이메일을 발송하려면:
1. `admin.html`의 `approveUser` 함수에 이메일 발송 코드 추가
2. 새로운 EmailJS 템플릿 생성 (승인 완료 안내)
3. 템플릿 ID를 코드에 추가

이 기능을 원하시면 추가로 구현해드릴 수 있습니다!

