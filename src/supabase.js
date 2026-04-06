// ─────────────────────────────────────────────────────────────
//  supabase.js — Supabase 초기화 + 인증/DB 서비스
//
//  환경변수 (.env.local):
//    VITE_SUPABASE_URL=https://xxxx.supabase.co
//    VITE_SUPABASE_ANON_KEY=eyJ...
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      ?? ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── PIN 해시 (SHA-256) ────────────────────────────────────────
async function hashPin(pin) {
  const data = new TextEncoder().encode(`traveller_${pin}_salt_kr2025`)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── 닉네임 정규화 ─────────────────────────────────────────────
const norm = (nick) => nick.trim().toLowerCase()

// ─────────────────────────────────────────────────────────────
//  회원가입
// ─────────────────────────────────────────────────────────────
export async function registerUser(nickname, pin) {
  const nick = norm(nickname)

  if (!nick || nick.length < 2 || nick.length > 20)
    throw new Error('닉네임은 2~20자여야 합니다.')
  if (!/^[a-zA-Z0-9가-힣_-]+$/.test(nick))
    throw new Error('닉네임에 특수문자는 _ - 만 허용됩니다.')
  if (!pin || !/^\d{4}$/.test(pin))
    throw new Error('PIN은 4자리 숫자여야 합니다.')

  // 중복 확인
  const { data: existing } = await supabase
    .from('users')
    .select('nickname')
    .eq('nickname', nick)
    .single()

  if (existing) throw new Error('이미 사용 중인 닉네임입니다.')

  const { error } = await supabase.from('users').insert({
    nickname:     nick,
    display_name: nickname.trim(),
    pin_hash:     await hashPin(pin),
  })

  if (error) throw new Error(`가입 실패: ${error.message}`)
  return nick
}

// ─────────────────────────────────────────────────────────────
//  로그인
// ─────────────────────────────────────────────────────────────
export async function loginUser(nickname, pin) {
  const nick = norm(nickname)

  const { data, error } = await supabase
    .from('users')
    .select('nickname, display_name, pin_hash')
    .eq('nickname', nick)
    .single()

  if (error || !data) throw new Error('존재하지 않는 닉네임입니다.')

  const inputHash = await hashPin(pin)
  if (data.pin_hash !== inputHash) throw new Error('PIN이 올바르지 않습니다.')

  return { key: nick, nickname: data.display_name }
}

// ─────────────────────────────────────────────────────────────
//  캐릭터 슬롯 목록 조회
// ─────────────────────────────────────────────────────────────
export async function listCharacters(nick) {
  const { data, error } = await supabase
    .from('characters')
    .select('slot, name, age, careers, upp, saved_at')
    .eq('nickname', nick)
    .order('slot')

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─────────────────────────────────────────────────────────────
//  캐릭터 저장 (upsert — 없으면 생성, 있으면 갱신)
// ─────────────────────────────────────────────────────────────
export async function saveCharacter(nick, slot, charState) {
  if (slot < 1 || slot > 5) throw new Error('슬롯은 1~5 사이여야 합니다.')

  const { error } = await supabase.from('characters').upsert({
    nickname: nick,
    slot,
    name:     charState.name    || '이름 없음',
    age:      charState.age     || 18,
    careers:  charState.careers?.length ?? 0,
    upp:      getUPP(charState.stats),
    state:    charState,          // Supabase JSONB — 직렬화 불필요
    saved_at: new Date().toISOString(),
  }, { onConflict: 'nickname,slot' })

  if (error) throw new Error(`저장 실패: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────
//  캐릭터 불러오기
// ─────────────────────────────────────────────────────────────
export async function loadCharacter(nick, slot) {
  const { data, error } = await supabase
    .from('characters')
    .select('state')
    .eq('nickname', nick)
    .eq('slot', slot)
    .single()

  if (error || !data) throw new Error('해당 슬롯에 저장된 캐릭터가 없습니다.')
  return data.state   // JSONB이므로 이미 객체
}

// ─────────────────────────────────────────────────────────────
//  캐릭터 삭제
// ─────────────────────────────────────────────────────────────
export async function deleteCharacter(nick, slot) {
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('nickname', nick)
    .eq('slot', slot)

  if (error) throw new Error(`삭제 실패: ${error.message}`)
}

// ── UPP 헬퍼 ─────────────────────────────────────────────────
function getUPP(stats = {}) {
  return ['str','dex','end','int','edu','soc'].map(k => {
    const v = stats[k] ?? 0
    return v >= 10 ? String.fromCharCode(55 + v) : String(v)
  }).join('')
}
