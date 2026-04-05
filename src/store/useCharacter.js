// ─────────────────────────────────────────────────────────────
//  useCharacter.js
//  캐릭터 상태 관리 커스텀 훅.
//  - useReducer로 상태 관리
//  - localStorage 자동 저장/복원
//  - 편의 액션 함수 노출
//  - 셀렉터 파생값 메모화
// ─────────────────────────────────────────────────────────────

import { useReducer, useEffect, useMemo, useCallback } from 'react'
import {
  characterReducer,
  INITIAL_STATE,
  STEPS,
  A,
  selectors,
} from './stepReducer.js'
import { roll2D, roll1D } from '../utils/dice.js'

const STORAGE_KEY = 'traveller_chargen_v1'

// ─── 커스텀 훅 ───────────────────────────────────────────────
export function useCharacter() {
  // localStorage에서 복원 시도
  const savedState = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const [state, dispatch] = useReducer(
    characterReducer,
    savedState ?? INITIAL_STATE,
  )

  // 상태 변경 시 localStorage 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 저장 실패 시 무시 (용량 초과 등)
    }
  }, [state])

  // ─── 파생값 (셀렉터) ───────────────────────────────────────
  const derived = useMemo(() => ({
    statModifiers:        selectors.allModifiers(state),
    backgroundSkillSlots: selectors.backgroundSkillSlots(state),
    totalTerms:           selectors.totalTerms(state),
    musterRolls:          selectors.musterRolls(state),
    sortedSkills:         selectors.sortedSkills(state),
    agingDm:              selectors.agingDm(state),
    pension:              selectors.calcPension(state),
    isOfficerEligible:    state.currentIsOfficer ||
                          ['army', 'navy', 'marine'].includes(state.currentCareer),
  }), [state])

  // ─── 편의 액션 함수 ────────────────────────────────────────

  // Step 1: 특성치
  const rollAllStats = useCallback(() => {
    const rolls = Array.from({ length: 6 }, () => {
      const d1 = Math.floor(Math.random() * 6) + 1
      const d2 = Math.floor(Math.random() * 6) + 1
      return { d1, d2, total: d1 + d2 }
    })
    dispatch({ type: A.ROLL_STATS, rolls })
  }, [])

  const rerollOneStat = useCallback((index) => {
    const d1 = Math.floor(Math.random() * 6) + 1
    const d2 = Math.floor(Math.random() * 6) + 1
    dispatch({ type: A.SET_STAT_ROLL, index, roll: { d1, d2, total: d1 + d2 } })
  }, [])

  const assignStat = useCallback((stat, rollIndex) => {
    dispatch({ type: A.ASSIGN_STAT, stat, rollIndex })
  }, [])

  const confirmStats = useCallback(() => {
    dispatch({ type: A.CONFIRM_STATS })
  }, [])

  // Step 2: 배경 기능
  const setBackgroundSkill = useCallback((index, skill) => {
    dispatch({ type: A.SET_BACKGROUND_SKILL, index, skill })
  }, [])

  const confirmBackground = useCallback(() => {
    dispatch({ type: A.CONFIRM_BACKGROUND })
  }, [])

  // Step 3: 경력 전 교육
  const skipPreCareer = useCallback(() => {
    dispatch({ type: A.SKIP_PRE_CAREER })
  }, [])

  const goPreCareer = useCallback(() => {
    dispatch({ type: A.GO_PRE_CAREER })
  }, [])

  const selectPreCareer = useCallback((preCareer) => {
    dispatch({ type: A.SELECT_PRE_CAREER, preCareer })
  }, [])

  const resolvePreCareer = useCallback((success, skills = [], honors = false, entryRoll = 12) => {
    dispatch({ type: A.RESOLVE_PRE_CAREER, success, skills, honors, entryRoll })
  }, [])

  // Step 4: 경력 선택
  const selectCareer = useCallback((careerId) => {
    dispatch({ type: A.SELECT_CAREER, careerId })
  }, [])

  const selectSpecialty = useCallback((specialtyId) => {
    dispatch({ type: A.SELECT_SPECIALTY, specialtyId })
  }, [])

  const resolveQualRoll = useCallback((success) => {
    dispatch({ type: A.RESOLVE_QUAL_ROLL, success })
  }, [])

  const acceptDraft = useCallback((careerId, specialtyId) => {
    dispatch({ type: A.ACCEPT_DRAFT, careerId, specialtyId })
  }, [])

  const startTerm = useCallback(() => {
    dispatch({ type: A.START_TERM })
  }, [])

  // Step 5: 경력 주기
  const resolveBasicTraining = useCallback((skills) => {
    dispatch({ type: A.RESOLVE_BASIC_TRAINING, skills })
  }, [])

  const clearNextQualDm = useCallback(() => {
    dispatch({ type: A.CLEAR_NEXT_QUAL_DM })
  }, [])

  const applyMedicalDebt = useCallback((amount) => {
    dispatch({ type: A.APPLY_MEDICAL_DEBT, amount })
  }, [])

  const markGradBenefitUsed = useCallback((field) => {
    dispatch({ type: A.MARK_GRAD_BENEFIT_USED, field })
  }, [])

  const rollCommission = useCallback((success) => {
    dispatch({ type: A.ROLL_COMMISSION, success })
  }, [])

  const resolveSurvival = useCallback((success) => {
    dispatch({ type: A.RESOLVE_SURVIVAL, success })
  }, [])

  const resolveEvent = useCallback((effects) => {
    dispatch({ type: A.RESOLVE_EVENT, effects })
  }, [])

  const resolveMishap = useCallback((effects, endCareer = true) => {
    dispatch({ type: A.RESOLVE_MISHAP, effects, endCareer })
  }, [])

  const resolveAdvancement = useCallback((success, newRank) => {
    dispatch({ type: A.RESOLVE_ADVANCEMENT, success, newRank })
  }, [])

  const resolveAging = useCallback((effects) => {
    dispatch({ type: A.RESOLVE_AGING, effects })
  }, [])

  const applySkill = useCallback((skill, level) => {
    dispatch({ type: A.APPLY_SKILL, skill, level })
  }, [])

  const applySkillDelta = useCallback((skill, delta) => {
    dispatch({ type: A.APPLY_SKILL, skill, delta })
  }, [])

  const applyStatChange = useCallback((stat, delta) => {
    dispatch({ type: A.APPLY_STAT_CHANGE, stat, delta })
  }, [])

  const addContact = useCallback((contactType, description = '') => {
    dispatch({ type: A.ADD_CONTACT, contactType, description })
  }, [])

  const removeContact = useCallback((id) => {
    dispatch({ type: A.REMOVE_CONTACT, id })
  }, [])

  // 주기 종료
  const endTermContinue = useCallback(() => {
    dispatch({ type: A.END_TERM_CONTINUE })
  }, [])

  const endTermChange = useCallback(() => {
    dispatch({ type: A.END_TERM_CHANGE })
  }, [])

  const endTermRetire = useCallback(() => {
    dispatch({ type: A.END_TERM_RETIRE })
  }, [])

  // Step 6: 완성
  const resolveMuster = useCallback((musterType, amountOrBenefit) => {
    if (musterType === 'cash') {
      dispatch({ type: A.RESOLVE_MUSTER, musterType: 'cash', amount: amountOrBenefit })
    } else {
      dispatch({ type: A.RESOLVE_MUSTER, musterType: 'benefit', benefit: amountOrBenefit })
    }
  }, [])

  const setName = useCallback((name) => {
    dispatch({ type: A.SET_NAME, name })
  }, [])

  const setHomeworld = useCallback((homeworld) => {
    dispatch({ type: A.SET_HOMEWORLD, homeworld })
  }, [])

  const finalize = useCallback(() => {
    dispatch({ type: A.FINALIZE })
  }, [])

  // 유틸
  const clearPendingEvent = useCallback(() => {
    dispatch({ type: A.CLEAR_PENDING_EVENT })
  }, [])

  const setPendingEvent = useCallback((event) => {
    dispatch({ type: A.SET_PENDING_EVENT, event })
  }, [])

  const resetCharacter = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    dispatch({ type: A.RESET })
  }, [])

  const loadState = useCallback((savedData) => {
    dispatch({ type: A.LOAD_STATE, state: savedData })
  }, [])

  // JSON 내보내기
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.name || '여행자'}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

  // JSON 불러오기
  const importJSON = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        loadState(data)
      } catch {
        alert('파일을 읽을 수 없습니다.')
      }
    }
    reader.readAsText(file)
  }, [loadState])

  return {
    // 원시 상태
    state,
    // 현재 스텝
    step: state.step,
    STEPS,
    // 파생값
    derived,
    // 액션 함수들
    actions: {
      // Step 1
      rollAllStats,
      rerollOneStat,
      assignStat,
      confirmStats,
      // Step 2
      setBackgroundSkill,
      confirmBackground,
      // Step 3
      skipPreCareer,
      goPreCareer,
      selectPreCareer,
      resolvePreCareer,
      // Step 4
      selectCareer,
      selectSpecialty,
      resolveQualRoll,
      acceptDraft,
      startTerm,
      // Step 5
      resolveBasicTraining,
      rollCommission,
      markGradBenefitUsed,
      clearNextQualDm,
      applyMedicalDebt,
      resolveSurvival,
      resolveEvent,
      resolveMishap,
      resolveAdvancement,
      resolveAging,
      applySkill,
      applySkillDelta,
      applyStatChange,
      addContact,
      removeContact,
      endTermContinue,
      endTermChange,
      endTermRetire,
      // Step 6
      resolveMuster,
      setName,
      setHomeworld,
      finalize,
      // 유틸
      clearPendingEvent,
      setPendingEvent,
      resetCharacter,
      exportJSON,
      importJSON,
    },
    // 저수준 dispatch (특수 케이스용)
    dispatch,
  }
}
