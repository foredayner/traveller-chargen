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
  preCareerHonors: false, // 우등 졸업 여부 (결괏값 10+)

  // 졸업 혜택 플래그 (경력 선택에서 소비됨)
  gradBenefits: {
    qualDm: 0,              // 자격 굴림 수정치 (+1 보통, +2 우등)
    qualEligible: [],       // DM 적용 가능한 경력 id 목록
    commissionDm: 0,        // 임관 굴림 수정치
    autoCommission: false,  // 임관 자동 성공
    canCommission: false,   // 대학교 졸업 후 임관 시도 가능 여부
    autoQual: null,         // 자격 자동 성공 경력 id (사관학교 연계)
    usedQualDm: false,      // 대학교 자격 DM 사용했는지
    usedAutoQual: false,    // 사관학교 자동성공 사용했는지
    usedCommission: false,  // 임관 혜택 이미 사용했는지
  },

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
      _advancementDm: 0,     // 이번 주기 누적 진급 DM (사건 등으로 쌓임)
      nextTermPrisoner: false,
    }
  */

  // 현재 진행 중인 주기 임시 상태
  currentCareer: null,    // careerId
  currentSpecialty: null, // specialtyId
  currentTerm: 1,         // 현재 주기 번호
  currentIsOfficer: false,
  currentRank: 0,         // 현재 주기에서 달성한 직급

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
  medicalDebt: 0,         // 의료 채무 (Cr)

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
  GO_PRE_CAREER:       'GO_PRE_CAREER',   // 경력 전교육 재진입
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
  CLEAR_NEXT_QUAL_DM:  'CLEAR_NEXT_QUAL_DM',
  APPLY_MEDICAL_DEBT:  'APPLY_MEDICAL_DEBT',
  MARK_GRAD_BENEFIT_USED: 'MARK_GRAD_BENEFIT_USED',    // { roll, success }
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
    case A.GO_PRE_CAREER: {
      // 경력 전교육 재진입 (3주기 미만만 가능)
      if (state.careers.length >= 3) return state
      return {
        ...state,
        preCareer: null,       // 선택 초기화
        preCareerSuccess: null,
        step: STEPS.PRE_CAREER,
      }
    }

    case A.SKIP_PRE_CAREER: {
      return { ...state, preCareer: null, step: STEPS.CAREER }
    }

    case A.SELECT_PRE_CAREER: {
      return { ...state, preCareer: action.preCareer }
    }

    case A.RESOLVE_PRE_CAREER: {
      const { success, honors = false, skills: newSkills = [] } = action
      let skills = { ...state.skills }
      for (const { skill, level } of newSkills) {
        skills[skill] = Math.max(skills[skill] ?? -1, level)
      }
      let stats = { ...state.stats }

      // 연계 군 경력 매핑
      const academyCareerMap = {
        army_academy:   'army',
        marine_academy: 'marine',
        navy_academy:   'navy',
      }
      const linkedCareer = academyCareerMap[state.preCareer] ?? null

      let gradBenefits = { ...state.gradBenefits }

      if (success) {
        if (state.preCareer === 'university') {
          // 대학교 졸업: edu +1 추가 (입학 시 +1 이미 적용)
          stats.edu = Math.min(15, stats.edu + 1)
          if (honors) stats.edu = Math.min(15, stats.edu + 1) // 우등: edu 추가 +1
          // 자격 DM 적용 대상 경력 (룰북 p.14)
          gradBenefits.qualDm = honors ? 2 : 1
          gradBenefits.qualEligible = [
            'entertainer', // 미디어 직군(언론인)
            'citizen',     // 시민(기업가)
            'agent',       // 요원
            'army',        // 육군
            'scout',       // 정찰 직군
            'scholar',     // 학자
            'navy',        // 해군
            'marine',      // 해병
          ]
          // 임관 굴림: 대학 졸업 후 첫 군 경력에서 가능
          gradBenefits.canCommission = true
          gradBenefits.commissionDm = honors ? 2 : 0
          gradBenefits.autoCommission = false
          gradBenefits.autoQual = null
        } else if (linkedCareer) {
          // 사관학교 졸업: edu +1
          stats.edu = Math.min(15, stats.edu + 1)
          if (honors) stats.soc = Math.min(15, stats.soc + 1)
          // 사관학교는 연계 경력 자격 자동 성공
          gradBenefits.autoQual = linkedCareer
          gradBenefits.qualDm = 0
          gradBenefits.qualEligible = []
          // 임관: 사관학교 +2, 우등 자동 성공
          gradBenefits.canCommission = true
          gradBenefits.commissionDm = honors ? 99 : 2  // 99 = 자동성공
          gradBenefits.autoCommission = honors
        }
      } else {
        // 졸업 실패: 사관학교는 결괏값 3+이면 자동 입대는 가능
        // (gradBenefits 초기화 유지 — 혜택 없음)
        if (linkedCareer) {
          // 졸업 실패해도 autoQual은 부여 (2 이하가 아닌 경우 자동 입대)
          // 단 임관 굴림은 불가
          gradBenefits.autoQual = action.entryRoll >= 3 ? linkedCareer : null
        }
      }

      return {
        ...state,
        preCareerSuccess: success,
        preCareerHonors: honors,
        gradBenefits,
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

    case A.CLEAR_NEXT_QUAL_DM:
      return { ...state, _nextQualDm: 0 }

    case A.APPLY_MEDICAL_DEBT: {
      // 의료비: 1D×10,000 Cr. 현금으로 지불 가능하면 차감, 부족하면 채무
      const cost = action.amount  // 컴포넌트에서 굴려서 넘김
      const canPay = (state.cash ?? 0) >= cost
      return canPay
        ? { ...state, cash: state.cash - cost }
        : { ...state, cash: 0, medicalDebt: (state.medicalDebt ?? 0) + cost - (state.cash ?? 0) }
    }

    case A.MARK_GRAD_BENEFIT_USED: {
      const field = action.field  // 'qualDm' | 'commission'
      return {
        ...state,
        gradBenefits: {
          ...state.gradBenefits,
          usedQualDm:     field === 'qualDm'     ? true : state.gradBenefits.usedQualDm,
          usedAutoQual:   field === 'autoQual'   ? true : state.gradBenefits.usedAutoQual,
          usedCommission: field === 'commission'  ? true : state.gradBenefits.usedCommission,
        }
      }
    }

    case A.ROLL_COMMISSION: {
      if (!action.success) {
        return { ...state, currentIsOfficer: false }
      }
      // 임관 성공: 장교 계급 1로 시작
      return {
        ...state,
        currentIsOfficer: true,
        currentRank: 1,  // 임관 = 계급 1 장교
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
        next.currentRank = 0   // 사고 종료 시 초기화
      }
      return next
    }

    case A.RESOLVE_ADVANCEMENT: {
      const { success, newRank } = action
      if (!success) return state
      // currentRank에 진급 결과 저장 (END_TERM에서 careers에 기록됨)
      return { ...state, currentRank: newRank }
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
      const alreadyRecorded = state.currentCareer === null
      const next = alreadyRecorded ? state : recordCurrentTerm(state, { survived: true })
      return {
        ...next,
        currentTerm: 1,
        currentCareer: null,
        currentSpecialty: null,
        currentIsOfficer: false,
        currentRank: 0,   // 새 경력 시작 시 직급 초기화
        age: alreadyRecorded ? state.age : state.age + 4,
        step: STEPS.CAREER,
      }
    }

    case A.END_TERM_RETIRE: {
      // 사고로 이미 기록된 경우(currentCareer=null)는 재기록 하지 않음
      const alreadyRecorded = state.currentCareer === null
      const next = alreadyRecorded ? state : recordCurrentTerm(state, { survived: true })
      return {
        ...next,
        age: alreadyRecorded ? state.age : state.age + 4,
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
    rank:        state.currentRank ?? 0,
    ...extra,
  }
  // currentRank는 0으로 초기화하지 않고 유지
  // → 다음 주기에서 이번 주기 달성 rank를 기반으로 +1 진급
  // 단 다른 경력으로 전환(END_TERM_CHANGE)할 때는 0으로 초기화
  return { ...state, careers: [...state.careers, termRecord], _advancementDm: 0 }
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
  /** 연금 계산 (룰북 p.44: 군/정찰 5주기 이상) */
  calcPension(state) {
    // 연금 지급 대상 경력
    const PENSION_CAREERS = ['army','navy','marine','scout']
    const PENSION_TABLE = { 5:4000,6:6000,7:8000,8:10000,9:12000,10:14000,11:16000,12:18000 }
    // 연금 대상 주기 수 (survived 여부 무관하게 해당 경력 주기는 카운트)
    const pensionTerms = state.careers.filter(c => PENSION_CAREERS.includes(c.careerId)).length
    if (pensionTerms < 5) return 0
    return PENSION_TABLE[Math.min(12, pensionTerms)] ?? 18000
  },

  musterRolls(state) {
    let total = 0
    for (const term of state.careers) {
      // 사고(survived=false)로 끝난 주기는 소득 굴림 없음
      // (명예 제대는 survived=true로 기록, 불명예는 false)
      if (term.survived === false) continue
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
