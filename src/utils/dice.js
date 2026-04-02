// ─────────────────────────────────────────────────────────────
//  dice.js
//  트래블러 주사위 유틸리티.
//  모든 굴림 결과는 { total, dice } 형태로 반환하거나
//  단순 숫자만 반환하는 두 가지 버전을 제공합니다.
// ─────────────────────────────────────────────────────────────

/** 1D6 */
export function roll1D() {
  return Math.floor(Math.random() * 6) + 1
}

/** 2D6 — 합계 숫자 반환 */
export function roll2D() {
  return roll1D() + roll1D()
}

/** 2D6 — 각 주사위 값과 합계 반환 */
export function roll2DDetailed() {
  const d1 = roll1D()
  const d2 = roll1D()
  return { d1, d2, total: d1 + d2 }
}

/** 1D3 */
export function rollD3() {
  return Math.ceil(roll1D() / 2)
}

/**
 * 특성치 판정
 * @param {number} statValue - 특성치 수치
 * @param {number} target    - 목표값 (e.g. 8)
 * @param {number} dm        - 추가 수정치
 * @returns {{ roll, total, success }}
 */
export function checkStat(statValue, target, dm = 0) {
  const mod = statModifier(statValue)
  const roll = roll2D()
  const total = roll + mod + dm
  return { roll, mod, dm, total, success: total >= target }
}

/**
 * 기능 판정
 * @param {number} skillLevel - 기능 레벨
 * @param {number} target
 * @param {number} dm
 */
export function checkSkill(skillLevel, target, dm = 0) {
  const roll = roll2D()
  const total = roll + Math.max(0, skillLevel) + dm
  return { roll, skillLevel, dm, total, success: total >= target }
}

/**
 * 특성치 수정치 계산
 * @param {number} val
 * @returns {number} -3 ~ +3
 */
export function statModifier(val) {
  if (val <= 0) return -3
  if (val <= 2) return -2
  if (val <= 5) return -1
  if (val <= 8) return 0
  if (val <= 11) return 1
  if (val <= 14) return 2
  return 3
}

/**
 * 부상 표 굴림
 * @param {number} [forcedWorst] - 강제 최악 결과 (사고 표 1번 처리용)
 * @returns {{ roll, result }}
 */
export function rollInjuryTable(forcedWorst = false) {
  if (forcedWorst) {
    // 부상 표를 두 번 굴려 낮은 값 적용
    const r1 = roll1D()
    const r2 = roll1D()
    return { roll: Math.min(r1, r2), rolls: [r1, r2] }
  }
  const roll = roll1D()
  return { roll, rolls: [roll] }
}

/**
 * 노화 표 굴림
 * @param {number} dm - 경력 주기 누적 DM (음수)
 * @returns {{ roll, total, result }}
 */
export function rollAgingTable(dm = 0) {
  const roll = roll2D()
  const total = roll + dm
  return { roll, dm, total }
}

/**
 * 애니메이션용 — 최종값에 수렴하는 중간 랜덤값 시퀀스 생성
 * @param {number} finalValue - 최종 주사위 결과
 * @param {number} steps      - 프레임 수
 * @returns {number[]}
 */
export function generateDiceAnimation(finalValue, steps = 8) {
  const frames = []
  for (let i = 0; i < steps - 1; i++) {
    frames.push(Math.floor(Math.random() * 6) + 1)
  }
  frames.push(finalValue)
  return frames
}

/**
 * 2D6 애니메이션용 프레임 쌍 생성
 * @param {number} d1Final
 * @param {number} d2Final
 * @param {number} steps
 * @returns {{ d1: number[], d2: number[] }}
 */
export function generateDicePairAnimation(d1Final, d2Final, steps = 8) {
  return {
    d1: generateDiceAnimation(d1Final, steps),
    d2: generateDiceAnimation(d2Final, steps),
  }
}
