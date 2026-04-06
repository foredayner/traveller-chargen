# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속 → 로그인
2. "New project" 클릭
3. 프로젝트 이름: `traveller-chargen`
4. 데이터베이스 비밀번호: 안전한 값으로 설정 (기억 안 해도 됨)
5. 리전: **Northeast Asia (Seoul)** 선택
6. 생성 완료까지 약 1~2분 대기

---

## 2. 테이블 생성

Supabase 대시보드 → **SQL Editor** → "New query" 에 아래 SQL 붙여넣고 실행:

```sql
-- 유저 테이블
CREATE TABLE users (
  nickname     TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  pin_hash     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 캐릭터 슬롯 테이블
CREATE TABLE characters (
  id        BIGSERIAL PRIMARY KEY,
  nickname  TEXT NOT NULL REFERENCES users(nickname) ON DELETE CASCADE,
  slot      INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 5),
  name      TEXT DEFAULT '이름 없음',
  age       INTEGER DEFAULT 18,
  careers   INTEGER DEFAULT 0,
  upp       TEXT DEFAULT '??????',
  state     JSONB NOT NULL,
  saved_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nickname, slot)
);

-- 인덱스
CREATE INDEX idx_characters_nickname ON characters(nickname);
```

---

## 3. Row Level Security (RLS) 설정

같은 SQL Editor에서 실행:

```sql
-- RLS 활성화
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- users: 누구나 읽기/생성 가능 (PIN으로 보호)
CREATE POLICY "users_read"   ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);

-- characters: 누구나 읽기/쓰기/삭제 (닉네임+PIN으로 앱 단에서 보호)
CREATE POLICY "chars_read"   ON characters FOR SELECT USING (true);
CREATE POLICY "chars_write"  ON characters FOR INSERT WITH CHECK (true);
CREATE POLICY "chars_update" ON characters FOR UPDATE USING (true);
CREATE POLICY "chars_delete" ON characters FOR DELETE USING (true);
```

---

## 4. API 키 복사

Supabase 대시보드 → **Project Settings** → **API**

- **Project URL**: `https://xxxx.supabase.co`
- **anon public**: `eyJ...` (공개 키)

---

## 5. 환경변수 설정

### 로컬 개발 — `.env.local` 파일 생성 (프로젝트 루트)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel 배포 환경변수

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**

| 이름 | 값 |
|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |

추가 후 **Redeploy** 필요.

---

## 6. .gitignore 확인

`.env.local`이 포함되어 있는지 확인:
```
.env.local
.env*.local
```

---

## 데이터 구조

```
users
├── nickname (PK)     : "starwanderer"
├── display_name      : "StarWanderer"
├── pin_hash          : "sha256..."
└── created_at        : 2025-01-01

characters
├── id (PK)           : 1
├── nickname (FK)     : "starwanderer"
├── slot              : 1  (1~5)
├── name              : "자에스 다르"
├── age               : 34
├── careers           : 3
├── upp               : "7A8956"
├── state             : { ... 전체 캐릭터 상태 JSONB ... }
└── saved_at          : 2025-01-15
```

---

## 확인

SQL Editor에서 데이터 조회:
```sql
SELECT * FROM users;
SELECT nickname, slot, name, age, careers, upp, saved_at FROM characters;
```
