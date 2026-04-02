// ─────────────────────────────────────────────────────────────
//  eventsData.js
//  events.json의 사건/사고 데이터를 컴포넌트에서 바로 쓸 수 있도록
//  경량 어댑터로 노출합니다.
//  전체 events.json은 /public/data/events.json 또는
//  import로 직접 로드할 수 있으나, 여기서는 핵심 참조 구조만 인라인합니다.
// ─────────────────────────────────────────────────────────────

// 사건 타입 상수 — EventResolver 컴포넌트에서 분기 처리에 사용
export const EVENT_TYPE = {
  MISHAP_FORCED:       'mishap_forced',    // 사고 표로 강제 이동
  MISHAP_NO_END:       'mishap_no_end',    // 사고 굴림하지만 경력 종료 없음
  LIFE_EVENT:          'life_event',       // 생활 사건 표
  WEIRD_EVENT:         'weird_event',      // 기이한 사건 (1D 서브표)
  INJURY:              'injury',           // 부상 표
  CHOICE:              'choice',           // 플레이어 선택 분기
  CHECK:               'check',            // 판정 굴림
  AUTO_ADVANCE:        'auto_advance',     // 자동 진급
  AUTO_ADVANCE_OR_COM: 'auto_advance_or_commission', // 자동 진급 또는 임관
  SKILL_GAIN:          'skill',            // 기능 직접 획득
  SKILL_CHOICE:        'skill_choice',     // 여러 기능 중 선택
  STAT_CHANGE:         'stat',             // 특성치 변경
  CONTACT:             'contact',          // 연줄 획득
  ALLY:                'ally',             // 조력자 획득
  RIVAL:               'rival',            // 경쟁자 획득
  ENEMY:               'enemy',            // 적수 획득
  ADVANCEMENT_DM:      'advancement_dm',   // 진급 굴림 DM
  MUSTER_DM:           'muster_dm',        // 소득 굴림 DM
  NEXT_QUAL_DM:        'next_qualification_dm', // 다음 자격 굴림 DM
  PRISONER:            'next_term_prisoner',    // 다음 주기 죄수 경력
  EXTRA_MUSTER:        'extra_muster_roll',     // 소득 굴림 추가
  LOSE_MUSTER:         'lose_muster_roll',      // 소득 굴림 손실
  ANY_SKILL_UP:        'any_skill_up',          // 보유 기능 중 하나 향상
  END_CAREER:          'end_career',            // 경력 종료
}

// ─── 생활 사건 표 (공용) ──────────────────────────────────────
export const lifeEvents = {
  2:  { name: '질병 또는 부상',  text: '부상을 입거나 병에 걸립니다.',
        effects: [{ type: EVENT_TYPE.INJURY }] },
  3:  { name: '출생 또는 사망',  text: '가족이나 친구 등 가까운 사람이 사망하거나 태어납니다.',
        effects: [] },
  4:  { name: '연애의 끝',       text: '당신이 하고 있던 연애가 좋지 못한 결말을 맞습니다.',
        effects: [{ type: EVENT_TYPE.RIVAL }] },
  5:  { name: '연애의 발전',     text: '당신이 하고 있던 연애가 더 깊어집니다.',
        effects: [{ type: EVENT_TYPE.ALLY }] },
  6:  { name: '연애의 시작',     text: '연애를 시작합니다.',
        effects: [{ type: EVENT_TYPE.ALLY }] },
  7:  { name: '새로운 연줄',     text: '새로운 연줄을 얻습니다.',
        effects: [{ type: EVENT_TYPE.CONTACT }] },
  8:  { name: '배신',            text: '친구에게 배신당합니다.',
        effects: [{ type: 'contact_to_rival_or_new_enemy' }] },
  9:  { name: '여행',            text: '다른 세계로 이주합니다. 다음 자격 굴림에 수정치 +2를 받습니다.',
        effects: [{ type: EVENT_TYPE.NEXT_QUAL_DM, value: 2 }] },
  10: { name: '행운',            text: '뭔가 좋은 일이 일어납니다.',
        effects: [{ type: EVENT_TYPE.MUSTER_DM, value: 2, uses: 1 }] },
  11: { name: '범죄',            text: '범죄를 저지르거나, 피해자가 되거나, 혐의로 고발됩니다.',
        effects: [{ type: EVENT_TYPE.CHOICE, options: [
          { label: '소득 굴림 1회 잃기', effects: [{ type: EVENT_TYPE.LOSE_MUSTER, count: 1 }] },
          { label: '다음 주기 죄수 경력', effects: [{ type: EVENT_TYPE.PRISONER }] },
        ]}] },
  12: { name: '기이한 사건',     text: '특이한 일이 일어납니다. 1D를 굴립니다.',
        effects: [{ type: EVENT_TYPE.WEIRD_EVENT }],
        subTable: {
          1: { name: '초능력',    text: '초능력자 단체와 연이 닿습니다.' },
          2: { name: '외계인',    text: '외계 종족 사이에서 시간을 보냅니다.',
               effects: [{ type: EVENT_TYPE.SKILL_GAIN, skill: '학문', level: 1 }, { type: EVENT_TYPE.CONTACT }] },
          3: { name: '외계 유물', text: '기묘하고 특이한 외계 장치를 얻습니다.' },
          4: { name: '기억상실', text: '무슨 일이 일어나긴 했는데, 기억이 나지 않습니다.' },
          5: { name: '정부 접촉', text: '제국의 최상층부와 잠시 접촉하게 됩니다.' },
          6: { name: '고대 기술', text: '제국보다도 오래된 뭔가를 얻습니다.' },
        }
  },
}

// ─── 부상 표 ──────────────────────────────────────────────────
export const injuryTable = {
  1: { name: '빈사',          text: '신체 특성치 한 가지를 1D 낮추고, 신체 특성치 두 가지를 2만큼 낮춥니다.',
       effects: [{ type: 'stat_physical_minus_1d', count: 1 }, { type: 'stat_physical_minus', count: 2, value: 2 }] },
  2: { name: '극심한 부상',   text: '신체 특성치 한 가지를 1D 낮춥니다.',
       effects: [{ type: 'stat_physical_minus_1d', count: 1 }] },
  3: { name: '눈·팔·다리 상실', text: '근력 또는 민첩을 2 낮춥니다.',
       effects: [{ type: 'stat_choice_minus', stats: ['str','dex'], value: 2 }] },
  4: { name: '중상',          text: '신체 특성치 한 가지를 2 낮춥니다.',
       effects: [{ type: 'stat_physical_minus', count: 1, value: 2 }] },
  5: { name: '부상',          text: '신체 특성치 한 가지를 1 낮춥니다.',
       effects: [{ type: 'stat_physical_minus', count: 1, value: 1 }] },
  6: { name: '경상',          text: '특성치 영향 없음.', effects: [] },
}

// ─── 노화 표 ──────────────────────────────────────────────────
export const agingTable = [
  { maxTotal: -6, text: '신체 특성치 세 가지를 2 낮추고, 정신 특성치 한 가지를 1 낮춥니다.',
    effects: [{ type: 'stat_physical_minus', count: 3, value: 2 }, { type: 'stat_mental_minus', count: 1, value: 1 }] },
  { maxTotal: -5, text: '신체 특성치 세 가지를 2 낮춥니다.',
    effects: [{ type: 'stat_physical_minus', count: 3, value: 2 }] },
  { maxTotal: -4, text: '신체 특성치 두 가지를 2 낮추고, 한 가지를 1 낮춥니다.',
    effects: [{ type: 'stat_physical_minus', count: 2, value: 2 }, { type: 'stat_physical_minus', count: 1, value: 1 }] },
  { maxTotal: -3, text: '신체 특성치 한 가지를 2 낮추고, 두 가지를 1 낮춥니다.',
    effects: [{ type: 'stat_physical_minus', count: 1, value: 2 }, { type: 'stat_physical_minus', count: 2, value: 1 }] },
  { maxTotal: -2, text: '신체 특성치 세 가지를 1 낮춥니다.',
    effects: [{ type: 'stat_physical_minus', count: 3, value: 1 }] },
  { maxTotal: -1, text: '신체 특성치 두 가지를 1 낮춥니다.',
    effects: [{ type: 'stat_physical_minus', count: 2, value: 1 }] },
  { maxTotal:  0, text: '신체 특성치 한 가지를 1 낮춥니다.',
    effects: [{ type: 'stat_physical_minus', count: 1, value: 1 }] },
]

/** 노화 표 결과 조회 */
export function getAgingResult(total) {
  for (const row of agingTable) {
    if (total <= row.maxTotal) return row
  }
  return { text: '영향 없음.', effects: [] }
}

// ─── 경력별 사건/사고 표 (eventsData의 축약 버전) ────────────
// 전체 데이터는 /public/data/events.json 참조.
// 여기서는 컴포넌트 런타임에서 직접 임포트할 수 있도록
// 구조만 정의하고 실제 텍스트는 동적 임포트로 로드합니다.

let _eventsCache = null

export async function loadEventsData() {
  if (_eventsCache) return _eventsCache
  try {
    const res = await fetch('/data/events.json')
    _eventsCache = await res.json()
    return _eventsCache
  } catch {
    return {}
  }
}

// 동기 접근용 — 사전 로드된 경우에만 사용
export function getCareerEvent(careerId, roll) {
  if (!_eventsCache) return null
  return _eventsCache[careerId]?.events?.[String(roll)] ?? null
}

export function getCareerMishap(careerId, roll) {
  if (!_eventsCache) return null
  return _eventsCache[careerId]?.mishaps?.[String(roll)] ?? null
}

// 인라인 fallback (events.json 로드 실패 시 기본 메시지)
const defaultEvent = {
  text: '생활 사건이 발생합니다.',
  effects: [{ type: EVENT_TYPE.LIFE_EVENT }],
}

export default { lifeEvents, injuryTable, agingTable, getAgingResult, defaultEvent, EVENT_TYPE }
