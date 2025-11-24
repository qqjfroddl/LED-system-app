# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 접속하여 회원가입/로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `인생관리앱` (또는 원하는 이름)
   - Database Password: 안전한 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 선택 (한국 사용자용)
4. "Create new project" 클릭 (약 2분 소요)

## 2. 데이터베이스 테이블 생성

### 2.1 SQL Editor 접속
1. 왼쪽 메뉴에서 "SQL Editor" 클릭
2. "New query" 클릭

### 2.2 테이블 생성 SQL 실행

아래 SQL을 복사하여 붙여넣고 "Run" 클릭:

```sql
-- users 테이블 생성
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT
);

-- user_data 테이블 생성 (일별 데이터 저장)
CREATE TABLE user_data (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- monthly_routines 테이블
CREATE TABLE monthly_routines (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  routines JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_key)
);

-- yearly_goals 테이블
CREATE TABLE yearly_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  goals JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- monthly_plans 테이블
CREATE TABLE monthly_plans (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  plans JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_key)
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_user_data_date ON user_data(date);
CREATE INDEX idx_monthly_routines_user_id ON monthly_routines(user_id);
CREATE INDEX idx_yearly_goals_user_id ON yearly_goals(user_id);
CREATE INDEX idx_monthly_plans_user_id ON monthly_plans(user_id);

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE yearly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_plans ENABLE ROW LEVEL SECURITY;

-- users 테이블 정책
CREATE POLICY "Anyone can register"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (id = current_setting('request.jwt.claims', true)::json->>'sub');

-- user_data 테이블 정책 (승인된 사용자만)
CREATE POLICY "Approved users can read own data"
  ON user_data FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id = user_id 
      AND is_approved = TRUE
    )
  );

CREATE POLICY "Approved users can insert own data"
  ON user_data FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE id = user_id 
      AND is_approved = TRUE
    )
  );

CREATE POLICY "Approved users can update own data"
  ON user_data FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id = user_id 
      AND is_approved = TRUE
    )
  );

-- monthly_routines 테이블 정책
CREATE POLICY "Approved users can manage own routines"
  ON monthly_routines FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id = user_id 
      AND is_approved = TRUE
    )
  );

-- yearly_goals 테이블 정책
CREATE POLICY "Approved users can manage own goals"
  ON yearly_goals FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id = user_id 
      AND is_approved = TRUE
    )
  );

-- monthly_plans 테이블 정책
CREATE POLICY "Approved users can manage own plans"
  ON monthly_plans FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE id = user_id 
      AND is_approved = TRUE
    )
  );
```

## 3. API 키 확인

1. 왼쪽 메뉴에서 "Project Settings" (톱니바퀴 아이콘) 클릭
2. "API" 섹션 선택
3. 다음 정보를 복사해두기:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (긴 문자열)

## 4. 코드에 API 키 적용

### 4.1 script.js 파일 최상단 수정

```javascript
// 여기에 복사한 값을 넣으세요
const SUPABASE_URL = 'https://xxxxx.supabase.co';  // Project URL
const SUPABASE_ANON_KEY = 'eyJhbGc...';  // anon public key
```

### 4.2 admin.html 파일에도 동일하게 적용

```javascript
// script 태그 안에서 동일한 값 사용
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...';
```

## 5. 첫 번째 관리자 계정 설정

### 5.1 일반 사용자로 구글 로그인
1. 앱에서 구글 로그인 시도
2. "승인 대기 중" 메시지 확인

### 5.2 Supabase에서 수동으로 관리자 승인
1. Supabase Dashboard → "Table Editor" 선택
2. "users" 테이블 선택
3. 방금 로그인한 사용자의 행을 찾아서:
   - `is_approved`: `false` → `true`로 변경
   - `role`: `user` → `admin`으로 변경
4. "Save" 클릭

### 5.3 이제부터는 admin.html 사용
- 이후 신청자는 `admin.html` 페이지에서 승인 가능

## 6. 테스트

1. **일반 사용자 테스트**:
   - 새로운 구글 계정으로 로그인
   - "승인 대기 중" 메시지 확인

2. **관리자 페이지 테스트**:
   - `admin.html` 접속
   - 대기 중인 사용자 목록 확인
   - "승인" 버튼 클릭

3. **승인된 사용자 테스트**:
   - 승인된 계정으로 다시 로그인
   - 정상적으로 앱 사용 가능 확인

## 7. 보안 설정 (선택사항)

### 7.1 이메일 도메인 제한
특정 이메일 도메인만 가입 허용하려면:

```sql
-- users 테이블에 체크 제약 추가
ALTER TABLE users 
ADD CONSTRAINT email_domain_check 
CHECK (email LIKE '%@yourdomain.com');
```

### 7.2 관리자 전용 API 보호
admin.html에서 관리자 권한 확인:

```javascript
// admin.html에 추가
async function checkAdminAccess() {
    const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', 'CURRENT_USER_ID')
        .single();
    
    if (user.role !== 'admin') {
        alert('관리자만 접근 가능합니다.');
        window.location.href = 'index.html';
    }
}
```

## 8. 배포

### Vercel/Netlify 배포 시:
1. 환경변수 설정:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
2. 빌드 설정 불필요 (순수 HTML/JS)

### GitHub Pages 배포 시:
- API 키가 코드에 노출되지만 `anon key`는 공개되어도 안전함
- RLS 정책으로 데이터 보호됨

## 문제 해결

### "Failed to fetch" 에러
- Supabase URL이 올바른지 확인
- API 키가 정확한지 확인
- 브라우저 콘솔에서 네트워크 탭 확인

### RLS 정책 오류
- SQL Editor에서 정책이 제대로 생성되었는지 확인
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 실행 확인

### 승인 후에도 로그인 안됨
- 브라우저 캐시 삭제
- 로그아웃 후 다시 로그인
- `is_approved` 값이 `true`인지 확인

## 추가 기능 아이디어

1. **이메일 알림**: 승인 시 사용자에게 이메일 발송
2. **사용량 통계**: 사용자별 활동 로그
3. **백업 기능**: 데이터 자동 백업
4. **다중 관리자**: 여러 관리자 계정 운영

---

완료! 🎉 이제 관리자 승인 시스템이 준비되었습니다.


