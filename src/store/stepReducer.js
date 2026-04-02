// ─────────────────────────────────────────────────────────────
//  stepReducer.js
//  캐릭터 생성 전체 상태를 관리하는 useReducer 리듀서.
//  상태는 단방향으로만 변경되며 모든 파생값은 셀렉터로 계산합니다.
// ─────────────────────────────────────────────────────────────

export const STEPS = {
  STATS:        1,  // 특성치 결정
  BACKGROUND:   2,  // 배경 기능 선택
  PRE_CAREER:   3,  // 경력 전 교육 (대학교 / 사관학교)
  CAREER:       4,  // 경력 선택 + 자격 굴림
  TERM:         5,  // 경력 주기 진행
  FINISH:       6,  // 완성 & 시트 출력
}

// ─── 초기 상태 ───────────────────────────────────────────────
export const INITIAL_STATE = {
  step: STEPS.STATS,

  // 기본 정보
  name: '',
  species: 'human',
  homeworld: '',

  // 특성치 (2D 배분)
  stats: {
    str: 0,   // 근력
    dex: 0,   // 민첩
    end: 0,   // 인내
    int: 0,   // 지능
    edu: 0,   // 교육
    soc: 0,   // 지위
  },

  // 미배분 주사위 풀 (각 2D 결과 6개를 굴려 저장)
  statRolls: [],          // e.g. [9, 7, 11, 12, 10, 6]
  statAssignments: {},    // { str: 2, dex: 0, ... } — statRolls 인덱스 매핑

  // 기능
  backgroundSkills: [],   // [{ skill: '행정', level: 0 }, ...]
  skills: {},             // { '우주 비행(소형선)': 2, '전자기기': 1, ... }

  // 경력 전 교육
  preCareer: null,        // null | 'university' | 'army_academy' | 'marine_academy' | 'navy_academy'
  preCareerSuccess: null, // null | true | false

  // 경력 기록 (주기 배열)
  careers: [],
  /*
    careers 배열의 각 원소:
    {
      careerId: 'navy',
      specialtyId: 'flight',
      term: 1,               // 주기 번호
      isOfficer: false,
      rank: 2,               // 도달한 직급/계급
      survived: true,
      eventRoll: 8,
      mishapRoll: null,
      skillsGained: ['우주 비행(소형선)-1'],
      cashRolls: 1,
      benefitRolls: 1,
      advancementDm: 0,      // 이번 주기 누적 진급 DM
      nextTermPrisoner: false,
    }
  */

  // 현재 진행 중인 주기 임시 상태
  currentCareer: null,    // careerId
  currentSpecialty: null, // specialtyId
  currentTerm: 1,         // 현재 주기 번호
  currentIsOfficer: false,

  // 플래그
  isDrafted: false,       // 징병 여부
  hasDrafted: false,      // 한 번이라도 징병되었는지
  pendingPrisoner: false, // 다음 주기 죄수 경력 강제

  // 연줄 / 관계
  contacts: [],
  /*
    contacts 배열의 각 원소:
    {
      id: uuid,
      type: 'ally' | 'contact' | 'rival' | 'enemy',
      description: '',
      careerId: 'navy',
      term: 2,
    }
  */

  // 재정
  cashRollsUsed: 0,       // 현금 굴림 총 사용 횟수 (최대 3)
  cash: 0,
  benefits: [],           // ['함선 지분', '여행자 지원 협회 가입', ...]
  pension: 0,             // 월 연금 (Cr)

  // 노화
  age: 18,
  agingDmAccumulated: 0,  // 노화 누적 DM

  // 임시 이벤트 결과 (UI 표시용)
  pendingEvent: null,
  /*
    pendingEvent:
    {
      type: 'choice' | 'check' | 'life_event' | 'mishap_no_end' | ...,
      data: { ... },
      onResolve: 'ACTION_TYPE',
    }
  */

  // 완성 여부
  isComplete: false,
}

// ─── 액션 타입 ───────────────────────────────────────────────
export const A = {
  // Step 1: 특성치
  ROLL_STATS:          'ROLL_STATS',
  SET_STAT_ROLL:       'SET_STAT_ROLL',      // 단일 재굴림
  ASSIGN_STAT:         'ASSIGN_STAT',        // 특성치 ↔ 주사위 배분
  CONFIRM_STATS:       'CONFIRM_STATS',

  // Step 2: 배경 기능
  SET_BACKGROUND_SKILL:'SET_BACKGROUND_SKILL',
  CONFIRM_BACKGROUND:  'CONFIRM_BACKGROUND',

  // Step 3: 경력 전 교육
  SKIP_PRE_CAREER:     'SKIP_PRE_CAREER',
  SELECT_PRE_CAREER:   'SELECT_PRE_CAREER',
  RESOLVE_PRE_CAREER:  'RESOLVE_PRE_CAREER', // { success, skills }

  // Step 4: 경력 선택
  SELECT_CAREER:       'SELECT_CAREER',      // { careerId }
  SELECT_SPECIALTY:    'SELECT_SPECIALTY',   // { specialtyId }
  RESOLVE_QUAL_ROLL:   'RESOLVE_QUAL_ROLL',  // { roll, success }
  ACCEPT_DRAFT:        'ACCEPT_DRAFT',       // 징병 수락
  START_TERM:          'START_TERM',

  // Step 5: 경력 주기
  RESOLVE_BASIC_TRAINING: 'RESOLVE_BASIC_TRAINING', // { skills }
  ROLL_COMMISSION:     'ROLL_COMMISSION',    // { roll, success }
  RESOLVE_SURVIVAL:    'RESOLVE_SURVIVAL',  // { roll, success }
  RESOLVE_EVENT:       'RESOLVE_EVENT',     // { roll, choice?, effects[] }
  RESOLVE_MISHAP:      'RESOLVE_MISHAP',    // { roll, effects[] }
  RESOLVE_ADVANCEMENT: 'RESOLVE_ADVANCEMENT',// { roll, success, newRank }
  RESOLVE_AGING:       'RESOLVE_AGING',     // { roll, effects[] }
  APPLY_SKILL:         'APPLY_SKILL',       // { skill, level }
  APPLY_STAT_CHANGE:   'APPLY_STAT_CHANGE', // { stat, delta }
  ADD_CONTACT:         'ADD_CONTACT',       // { type, description }
  REMOVE_CONTACT:      'REMOVE_CONTACT',    // { id }

  // 주기 종료
  END_TERM_CONTINUE:   'END_TERM_CONTINUE', // 같은 경력 계속
  END_TERM_CHANGE:     'END_TERM_CHANGE',   // 다른 경력으로
  END_TERM_RETIRE:     'END_TERM_RETIRE',   // 은퇴

  // Step 6: 소득 & 완성
  RESOLVE_MUSTER:      'RESOLVE_MUSTER',    // { cashOrBenefit, roll, result }
  SET_NAME:            'SET_NAME',
  SET_HOMEWORLD:       'SET_HOMEWORLD',
  FINALIZE:            'FINALIZE',

  // 유틸
  CLEAR_PENDING_EVENT: 'CLEAR_PENDING_EVENT',
  SET_PENDING_EVENT:   'SET_PENDING_EVENT',
  LOAD_STATE:          'LOAD_STATE',
  RESET:               'RESET',
}

// ─── 리듀서 ──────────────────────────────────────────────────
export function characterReducer(state, action) {
  switch (action.type) {

    // ── Step 1: 특성치 ────────────────────────────────────────
    case A.ROLL_STATS: {
      // action.rolls: [9, 7, 11, 12, 10, 6] 6개의 2D 결과
      const rolls = action.rolls
      return {
        ...state,
        statRolls: rolls,
        // 초기에는 순서대로 자동 배분 (드래그로 바꿀 수 있음)
        statAssignments: { str: 0, dex: 1, end: 2, int: 3, edu: 4, soc: 5 },
      }
    }

    case A.SET_STAT_ROLL: {
      // 단일 주사위 재굴림: { index, roll }
      const newRolls = [...state.statRolls]
      newRolls[action.index] = action.roll
      return { ...state, statRolls: newRolls }
    }

    case A.ASSIGN_STAT: {
      // 드래그 앤 드롭으로 특성치에 주사위 재배분: { stat, rollIndex }
      // 기존에 해당 rollIndex를 쓰던 stat과 swap
      const prev = { ...state.statAssignments }
      const oldStatForIndex = Object.keys(prev).find(k => prev[k] === action.rollIndex)
      const oldIndexForStat = prev[action.stat]
      if (oldStatForIndex) prev[oldStatForIndex] = oldIndexForStat
      prev[action.stat] = action.rollIndex
      return { ...state, statAssignments: prev }
    }

    case A.CONFIRM_STATS: {
      // 배분 확정 → stats 객체 계산
      const { statRolls, statAssignments } = state
      const stats = {}
      for (const [statKey, rollIdx] of Object.entries(statAssignments)) {
        const roll = statRolls[rollIdx]
        stats[statKey] = (typeof roll === 'object' ? roll.total : roll) ?? 0
      }
      return { ...state, stats, step: STEPS.BACKGROUND }
    }

    // ── Step 2: 배경 기능 ─────────────────────────────────────
    case A.SET_BACKGROUND_SKILL: {
      // { index, skill } — index번째 슬롯에 skill 배치
      const slots = [...state.backgroundSkills]
      slots[action.index] = action.skill
        ? { skill: action.skill, level: 0 }
        : null
      return { ...state, backgroundSkills: slots.filter(Boolean) }
    }

    case A.CONFIRM_BACKGROUND: {
      // 배경 기능 → skills 반영
      const skills = { ...state.skills }
      for (const { skill, level } of state.backgroundSkills) {
        if (skill) skills[skill] = Math.max(skills[skill] ?? -1, level)
      }
      return { ...state, skills, step: STEPS.PRE_CAREER }
    }

    // ── Step 3: 경력 전 교육 ──────────────────────────────────
    case A.SKIP_PRE_CAREER: {
      return { ...state, preCareer: null, step: STEPS.CAREER }
    }

    case A.SELECT_PRE_CAREER: {
      return { ...state, preCareer: action.preCareer }
    }

    case A.RESOLVE_PRE_CAREER: {
      const { success, skills: newSkills = [] } = action
      let skills = { ...state.skills }
      for (const { skill, level } of newSkills) {
        skills[skill] = Math.max(skills[skill] ?? -1, level)
      }
      // 졸업 보너스 적용
      let stats = { ...state.stats }
      if (success && state.preCareer === 'university') {
        stats.edu = Math.min(15, stats.edu + 2)
        stats.soc = Math.min(15, stats.soc + 1)
      }
      return {
        ...state,
        preCareerSuccess: success,
        skills,
        stats,
        step: STEPS.CAREER,
      }
    }

    // ── Step 4: 경력 선택 ─────────────────────────────────────
    case A.SELECT_CAREER: {
      return { ...state, currentCareer: action.careerId, currentSpecialty: null }
    }

    case A.SELECT_SPECIALTY: {
      return { ...state, currentSpecialty: action.specialtyId }
    }

    case A.RESOLVE_QUAL_ROLL: {
      if (action.success) {
        return { ...state, step: STEPS.TERM }
      }
      // 실패 시 — 징병/방랑자 선택 대기 (pendingEvent)
      return {
        ...state,
        pendingEvent: {
          type: 'qual_failed',
          careerId: state.currentCareer,
          hasDrafted: state.hasDrafted,
        },
      }
    }

    case A.ACCEPT_DRAFT: {
      // action: { careerId, specialtyId } 또는 자동 징병
      return {
        ...state,
        currentCareer: action.careerId,
        currentSpecialty: action.specialtyId,
        isDrafted: true,
        hasDrafted: true,
        pendingEvent: null,
        step: STEPS.TERM,
      }
    }

    case A.START_TERM: {
      return { ...state, step: STEPS.TERM, pendingEvent: null }
    }

    // ── Step 5: 경력 주기 ─────────────────────────────────────
    case A.RESOLVE_BASIC_TRAINING: {
      // 첫 주기: 직종 기능표 전체를 레벨 0으로
      const skills = { ...state.skills }
      for (const { skill } of (action.skills || [])) {
        if (!(skill in skills)) skills[skill] = 0
      }
      return { ...state, skills }
    }

    case A.ROLL_COMMISSION: {
      return {
        ...state,
        currentIsOfficer: action.success,
      }
    }

    case A.RESOLVE_SURVIVAL: {
      if (action.success) {
        return { ...state, pendingEvent: null }
      }
      // 생존 실패 → 사고 표로
      return {
        ...state,
        pendingEvent: {
          type: 'mishap_forced',
          careerId: state.currentCareer,
        },
      }
    }

    case A.RESOLVE_EVENT: {
      const { effects = [] } = action
      return applyEffects({ ...state, pendingEvent: null }, effects)
    }

    case A.RESOLVE_MISHAP: {
      const { effects = [], endCareer = true } = action
      let next = applyEffects({ ...state, pendingEvent: null }, effects)
      if (endCareer) {
        // 경력 종료 처리: 현재 주기 기록 후 경력 선택으로
        next = recordCurrentTerm(next, { survived: false })
        next.step = STEPS.CAREER
        next.currentCareer = null
        next.currentSpecialty = null
        next.currentTerm = 1
        next.currentIsOfficer = false
      }
      return next
    }

    case A.RESOLVE_ADVANCEMENT: {
      const { success, newRank } = action
      if (!success) return state
      // 직급 상승 + 직급 보너스 기능 반영은 컴포넌트에서 계산 후 APPLY_SKILL로
      const careers = [...state.careers]
      if (careers.length > 0) {
        const last = { ...careers[careers.length - 1], rank: newRank }
        careers[careers.length - 1] = last
      }
      return { ...state, careers }
    }

    case A.RESOLVE_AGING: {
      const { effects = [] } = action
      return applyEffects(state, effects)
    }

    case A.APPLY_SKILL: {
      // { skill, level, delta } — level: 절대값, delta: 상대증감
      const skills = { ...state.skills }
      if (action.delta !== undefined) {
        skills[action.skill] = Math.max(0, (skills[action.skill] ?? 0) + action.delta)
      } else {
        skills[action.skill] = Math.max(skills[action.skill] ?? 0, action.level)
      }
      return { ...state, skills }
    }

    case A.APPLY_STAT_CHANGE: {
      // { stat, delta }
      const stats = { ...state.stats }
      stats[action.stat] = Math.max(0, Math.min(15, (stats[action.stat] ?? 0) + action.delta))
      return { ...state, stats }
    }

    case A.ADD_CONTACT: {
      const contact = {
        id: crypto.randomUUID(),
        type: action.contactType,   // 'ally' | 'contact' | 'rival' | 'enemy'
        description: action.description ?? '',
        careerId: state.currentCareer,
        term: state.currentTerm,
      }
      return { ...state, contacts: [...state.contacts, contact] }
    }

    case A.REMOVE_CONTACT: {
      return { ...state, contacts: state.contacts.filter(c => c.id !== action.id) }
    }

    // ── 주기 종료 ──────────────────────────────────────────────
    case A.END_TERM_CONTINUE: {
      const next = recordCurrentTerm(state, { survived: true })
      return {
        ...next,
        currentTerm: state.currentTerm + 1,
        age: state.age + 4,
        step: STEPS.TERM,
      }
    }

    case A.END_TERM_CHANGE: {
      const next = recordCurrentTerm(state, { survived: true })
      return {
        ...next,
        currentTerm: 1,
        currentCareer: null,
        currentSpecialty: null,
        currentIsOfficer: false,
        age: state.age + 4,
        step: STEPS.CAREER,
      }
    }

    case A.END_TERM_RETIRE: {
      const next = recordCurrentTerm(state, { survived: true })
      return {
        ...next,
        age: state.age + 4,
        step: STEPS.FINISH,
      }
    }

    // ── Step 6: 완성 ──────────────────────────────────────────
    case A.RESOLVE_MUSTER: {
      // { type: 'cash'|'benefit', result }
      if (action.musterType === 'cash') {
        return {
          ...state,
          cash: state.cash + (action.amount ?? 0),
          cashRollsUsed: state.cashRollsUsed + 1,
        }
      }
      return {
        ...state,
        benefits: [...state.benefits, action.benefit],
      }
    }

    case A.SET_NAME:      return { ...state, name: action.name }
    case A.SET_HOMEWORLD: return { ...state, homeworld: action.homeworld }

    case A.FINALIZE: {
      return { ...state, isComplete: true }
    }

    // ── 유틸 ──────────────────────────────────────────────────
    case A.CLEAR_PENDING_EVENT: {
      return { ...state, pendingEvent: null }
    }

    case A.SET_PENDING_EVENT: {
      return { ...state, pendingEvent: action.event }
    }

    case A.LOAD_STATE: {
      return { ...INITIAL_STATE, ...action.state }
    }

    case A.RESET: {
      return { ...INITIAL_STATE }
    }

    default:
      return state
  }
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────

/**
 * 현재 주기를 careers 배열에 기록합니다.
 */
function recordCurrentTerm(state, extra = {}) {
  const termRecord = {
    careerId:    state.currentCareer,
    specialtyId: state.currentSpecialty,
    term:        state.currentTerm,
    isOfficer:   state.currentIsOfficer,
    rank:        0,  // advancement resolve 시 업데이트됨
    ...extra,
  }
  return { ...state, careers: [...state.careers, termRecord] }
}

/**
 * effects 배열을 순차 적용합니다.
 * EventResolver 컴포넌트가 더 복잡한 effects(choice, check 등)를
 * 처리한 후 단순화된 효과만 여기로 보냅니다.
 */
function applyEffects(state, effects) {
  let s = state
  for (const effect of effects) {
    switch (effect.type) {
      case 'stat':
        s = {
          ...s,
          stats: {
            ...s.stats,
            [effect.stat]: Math.max(0, Math.min(15, (s.stats[effect.stat] ?? 0) + effect.value)),
          },
        }
        break
      case 'skill':
        s = {
          ...s,
          skills: {
            ...s.skills,
            [effect.skill]: Math.max(s.skills[effect.skill] ?? 0, effect.level),
          },
        }
        break
      case 'skill_delta':
        s = {
          ...s,
          skills: {
            ...s.skills,
            [effect.skill]: Math.max(0, (s.skills[effect.skill] ?? 0) + effect.delta),
          },
        }
        break
      case 'ally':
        s = {
          ...s,
          contacts: [...s.contacts, {
            id: crypto.randomUUID(),
            type: 'ally',
            description: effect.description ?? '',
            careerId: s.currentCareer,
            term: s.currentTerm,
          }],
        }
        break
      case 'contact':
        s = {
          ...s,
          contacts: [...s.contacts, {
            id: crypto.randomUUID(),
            type: 'contact',
            description: effect.description ?? '',
            careerId: s.currentCareer,
            term: s.currentTerm,
          }],
        }
        break
      case 'rival':
        s = {
          ...s,
          contacts: [...s.contacts, {
            id: crypto.randomUUID(),
            type: 'rival',
            description: effect.description ?? '',
            careerId: s.currentCareer,
            term: s.currentTerm,
          }],
        }
        break
      case 'enemy':
        s = {
          ...s,
          contacts: [...s.contacts, {
            id: crypto.randomUUID(),
            type: 'enemy',
            description: effect.description ?? '',
            careerId: s.currentCareer,
            term: s.currentTerm,
          }],
        }
        break
      case 'advancement_dm':
        // 현재 주기의 advancementDm에 누적 (주기 기록 전)
        s = { ...s, _advancementDm: (s._advancementDm ?? 0) + effect.value }
        break
      case 'next_qualification_dm':
        s = { ...s, _nextQualDm: (s._nextQualDm ?? 0) + effect.value }
        break
      case 'muster_dm':
        s = { ...s, _musterDm: (s._musterDm ?? 0) + effect.value }
        break
      case 'next_term_prisoner':
        s = { ...s, pendingPrisoner: true }
        break
      case 'end_career':
        s = { ...s, _endCareer: true }
        break
      // 부상, life_event 등은 pendingEvent로 위임
      case 'injury':
        s = {
          ...s,
          pendingEvent: {
            type: 'injury',
            severity: effect.severity ?? 'normal',
          },
        }
        break
      case 'life_event':
        s = { ...s, pendingEvent: { type: 'life_event' } }
        break
      default:
        break
    }
  }
  return s
}

// ─── 셀렉터 (파생 데이터) ─────────────────────────────────────
export const selectors = {
  /** 특성치 수정치 */
  statModifier(val) {
    if (val <= 0) return -3
    if (val <= 2) return -2
    if (val <= 5) return -1
    if (val <= 8) return 0
    if (val <= 11) return 1
    if (val <= 14) return 2
    return 3
  },

  /** 교육 수정치 기반 배경 기능 슬롯 수 */
  backgroundSkillSlots(state) {
    return 3 + selectors.statModifier(state.stats.edu)
  },

  /** 특성치 수정치 객체 */
  allModifiers(state) {
    const result = {}
    for (const [k, v] of Object.entries(state.stats)) {
      result[k] = selectors.statModifier(v)
    }
    return result
  },

  /** 현재 경력의 총 주기 수 */
  totalTerms(state) {
    return state.careers.filter(c => c.careerId === state.currentCareer).length
      + (state.currentCareer ? 1 : 0)
  },

  /** 소득 굴림 가능 횟수 (직급 보너스 포함) */
  musterRolls(state) {
    let total = 0
    for (const term of state.careers) {
      total += 1 // 주기당 1회 기본
      const r = term.rank ?? 0
      if (r >= 5) total += 3
      else if (r >= 3) total += 2
      else if (r >= 1) total += 1
    }
    return total
  },

  /** 기능 목록 (레벨순 정렬) */
  sortedSkills(state) {
    return Object.entries(state.skills)
      .sort(([, a], [, b]) => b - a)
      .map(([skill, level]) => ({ skill, level }))
  },

  /** 나이에 따른 노화 DM */
  agingDm(state) {
    const extraTerms = Math.max(0, Math.floor((state.age - 34) / 4))
    return -extraTerms
  },
}
