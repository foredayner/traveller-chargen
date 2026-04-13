// StepTerm.jsx — Step 5: 경력 주기 진행
import { useState, useEffect } from 'react'
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import { roll1D, statModifier } from '../../utils/dice.js'
import careersData from '../../data/careersData.js'
import { lifeEvents, injuryTable, getAgingResult, loadEventsData } from '../../data/eventsData.js'
import EventResolver from '../EventResolver.jsx'
import { DiceRollInline } from '../DiceAnimator.jsx'



// ─── 특성치 키 맵 ─────────────────────────────────────────────
const STAT_KEY_MAP = { str:'str',dex:'dex',end:'end',int:'int',edu:'edu',soc:'soc' }
const STAT_KO = { str:'근력',dex:'민첩',end:'인내',int:'지능',edu:'교육',soc:'지위' }

// ─── 서브스텝 상수 ───────────────────────────────────────────
const SUB = {
  TRAINING:    'TRAINING',
  COMMISSION:  'COMMISSION',
  SURVIVAL:    'SURVIVAL',
  MISHAP:      'MISHAP',
  EVENT:       'EVENT',
  ADVANCEMENT: 'ADVANCEMENT',
  AGING:       'AGING',
  END:         'END',
}

const SUB_LABELS = {
  TRAINING:'기초훈련', COMMISSION:'임관', SURVIVAL:'생존',
  MISHAP:'사고', EVENT:'사건', ADVANCEMENT:'진급', AGING:'노화', END:'종료',
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
export default function StepTerm() {
  const { state, actions, derived } = useCharacterContext()
  const [sub, setSub]         = useState(SUB.TRAINING)
  const [results, setResults] = useState({})
  const [careerEvents, setCareerEvents] = useState(null)

  const career    = careersData[state.currentCareer]
  const specialty = career?.specialties.find(s => s.id === state.currentSpecialty)
  const isFirstTerm = state.careers.filter(c => c.careerId === state.currentCareer).length === 0
  const needAging   = state.age >= 34
  const hasCommission = ['army', 'navy', 'marine'].includes(state.currentCareer)
  // 임관 조건: 군 경력 + (첫 주기 OR 지위 8+) + 아직 장교 아님
  const canAttemptCommission = hasCommission
    && !state.currentIsOfficer
    && (isFirstTerm || (state.stats.soc ?? 0) >= 8)

  // events.json 비동기 로드
  useEffect(() => {
    loadEventsData().then(data => setCareerEvents(data))
  }, [])

  // ── 기초 훈련 ────────────────────────────────────────────────
  const handleBasicTraining = (skillsGained) => {
    actions.resolveBasicTraining(skillsGained)
    // 직급 0 보너스 기능 자동 부여 (예: 해병 직급0 → 사격 1)
    applyRankBonus(0)
    setSub(canAttemptCommission ? SUB.COMMISSION : SUB.SURVIVAL)
  }

  // ── 직급 보너스 기능 자동 적용 ──────────────────────────────
  const applyRankBonus = (newRank) => {
    const rankTable = career?.ranks
    const rankList = state.currentIsOfficer
      ? (rankTable?.officer ?? [])
      : (rankTable?.[state.currentSpecialty] ?? rankTable?.enlisted ?? rankTable?.all ?? [])
    const entry = rankList.find(r => r.rank === newRank)
    if (!entry?.bonus || entry.bonus === null) return

    const bonus = entry.bonus
    const STATS = ['str','dex','end','int','edu','soc']

    // 1. 특성치+N 형태: "end+1", "soc+1"
    const statMatch = bonus.match(/^(str|dex|end|int|edu|soc)\+(\d+)$/i)
    if (statMatch) {
      actions.applyStatChange(statMatch[1].toLowerCase(), parseInt(statMatch[2]))
      return
    }

    // 2. "soc-10 또는 soc+1 중 높은 쪽" — 현재 지위와 비교해 높은 값으로
    if (bonus.includes('높은 쪽')) {
      const setMatch = bonus.match(/soc-(\d+)/)
      const plusMatch = bonus.match(/soc\+(\d+)/)
      if (setMatch && plusMatch) {
        const setVal  = parseInt(setMatch[1])
        const plusVal = parseInt(plusMatch[1])
        const curSoc  = state.stats.soc ?? 0
        const newSoc  = Math.max(setVal, curSoc + plusVal)
        actions.applyStatChange('soc', newSoc - curSoc)
      }
      return
    }

    // 3. "X 또는 Y" 선택형 — 첫 번째 옵션 자동 적용 (UI 선택은 향후 개선)
    if (bonus.includes(' 또는 ')) {
      const firstOption = bonus.split(' 또는 ')[0].trim()
      const skillMatch = firstOption.match(/^(.+)-(\d+)$/)
      if (skillMatch) {
        actions.applySkill(skillMatch[1].trim(), parseInt(skillMatch[2]))
      }
      return
    }

    // 4. 일반 기능-레벨 형태: "지도력-1", "근접전(도검)-1"
    const skillMatch = bonus.match(/^(.+)-(\d+)$/)
    if (skillMatch) {
      actions.applySkill(skillMatch[1].trim(), parseInt(skillMatch[2]))
    }
  }

  // career 또는 specialty 없으면 경력 선택으로 안내
  if (!career || !specialty) {
    return (
      <div className="card" style={{ textAlign:'center', padding:'2rem' }}>
        <p style={{ color:'var(--col-text-muted)', marginBottom:'1rem', fontSize:'0.9rem' }}>
          경력 또는 직종 정보가 없습니다. 경력을 먼저 선택해주세요.
        </p>
        <button className="btn btn-primary" onClick={actions.endTermChange}>← 경력 선택으로</button>
      </div>
    )
  }

  return (
    <div>
      {/* ── 헤딩 ── */}
      <div className="step-heading">
        <h2>
          {career?.name ?? '—'} — {specialty?.name ?? '—'}
          <span className="badge badge-cyan" style={{ marginLeft:'0.75rem', verticalAlign:'middle' }}>
            {state.currentTerm}주기 · {state.age}세
          </span>
          {state.currentIsOfficer && (
            <span className="badge badge-gold" style={{ marginLeft:'0.5rem', verticalAlign:'middle' }}>장교</span>
          )}
        </h2>
        <p>경력 주기를 한 단계씩 진행합니다. 이번 주기가 끝나면 4년이 지납니다.</p>
      </div>

      {/* ── 서브스텝 진행 표시 ── */}
      <div style={{ display:'flex', gap:'0.4rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {Object.keys(SUB).filter(s => s !== 'MISHAP' || !results.survival?.success).map((s, i) => {
          const subList = Object.keys(SUB)
          const currentIdx = subList.indexOf(sub)
          const thisIdx = subList.indexOf(s)
          const status = thisIdx < currentIdx ? 'done' : thisIdx === currentIdx ? 'active' : 'pending'
          return (
            <span key={s} className={`badge ${status==='done'?'badge-gold':status==='active'?'badge-cyan':'badge-muted'}`}>
              {status === 'done' ? '✓ ' : ''}{SUB_LABELS[s]}
            </span>
          )
        })}
      </div>

      {/* ── 기초 훈련 ── */}
      {sub === SUB.TRAINING && (
        <SkillTrainingPanel
          career={career}
          specialty={specialty}
          isFirstTerm={isFirstTerm}
          onDone={handleBasicTraining}
        />
      )}

      {/* ── 임관 굴림 ── */}
      {sub === SUB.COMMISSION && (
        <div className="card">
          <div className="card-title">
            임관 굴림 — 지위 8+
            <span className="card-title-en">COMMISSION</span>
          </div>
          {(() => {
            const gb = state.gradBenefits
            const isMilitaryCareer = ['army','navy','marine'].includes(state.currentCareer)
            // 졸업 후 첫 군 경력인지:
            // 현재 경력이 군 경력이고, 이미 장교가 아니고, 임관 혜택 미사용
            // (같은 경력 2주기 임관 재도전 허용 — 지위 8+ 조건은 별도 체크)
            const isFirstGradMilitary = gb.canCommission && !gb.usedCommission
              && isMilitaryCareer && !state.currentIsOfficer
            const commDm = isFirstGradMilitary ? (gb.commissionDm === 99 ? 0 : gb.commissionDm) : 0
            const autoComm = isFirstGradMilitary && (gb.autoCommission || gb.commissionDm === 99)
            // 임관 DM: 첫 주기가 아니면 -1 (지위 8+인 경우)
            const notFirstDm = !isFirstTerm ? -1 : 0

            return (
              <>
                <p className="text-muted" style={{ fontSize:'0.82rem', marginBottom:'1rem' }}>
                  {isFirstTerm ? '첫 주기 임관 시도.' : '지위 8+ 임관 시도 (비첫주기 -1).'}
                  {' '}현재 지위: <strong style={{color:'var(--col-cyan)',fontFamily:'var(--font-mono)'}}>{state.stats.soc ?? 0}</strong>
                  {(autoComm || commDm > 0) && (() => {
                    const schoolNames = { army_academy:'육군사관학교', marine_academy:'해병사관학교', navy_academy:'해군사관학교', university:'대학교' }
                    const schoolName = schoolNames[state.preCareer] ?? '졸업'
                    const honorsStr = state.preCareerHonors ? ' 우등' : ''
                    return (
                      <div style={{marginTop:'0.4rem',padding:'0.4rem 0.6rem',background:'rgba(200,168,75,0.07)',border:'1px solid var(--col-gold-dim)',borderRadius:'var(--radius-sm)',fontSize:'0.75rem',color:'var(--col-gold)'}}>
                        {autoComm
                          ? `★ ${schoolName}${honorsStr} 졸업 — 임관 자동 성공`
                          : `★ ${schoolName}${honorsStr} 졸업 — 임관 판정 +${commDm}`}
                      </div>
                    )
                  })()}
                  {notFirstDm < 0 && <div style={{marginTop:'3px',fontSize:'0.72rem',color:'var(--col-amber)'}}>비첫주기 DM {notFirstDm}</div>}
                </p>
                {!results.commission && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                    {autoComm ? (
                      <div>
                        <p style={{color:'var(--col-green)',fontSize:'0.82rem',marginBottom:'0.75rem'}}>
                          사관학교 우등 졸업으로 임관 자동 성공!
                        </p>
                        <button className="btn btn-primary" onClick={() => {
                          setResults(rv => ({ ...rv, commission: { total:'자동', success:true } }))
                          actions.rollCommission(true)
                          actions.markGradBenefitUsed('commission')
                          applyRankBonus(1)
                          setSub(SUB.SURVIVAL)
                        }}>임관 확인 →</button>
                      </div>
                    ) : (
                      <DiceRollInline
                        label="임관 굴림"
                        stat="지위"
                        target={8}
                        count={2}
                        mod={statModifier(state.stats.soc ?? 0) + commDm + notFirstDm}
                        breakdown={[
                          { label:'지위 수정치', value: statModifier(state.stats.soc ?? 0) },
                          ...(commDm > 0 ? [{ label:'졸업 DM', value: commDm }] : []),
                          ...(notFirstDm < 0 ? [{ label:'비첫주기 페널티', value: notFirstDm }] : []),
                        ].filter(b => b.value !== 0)}
                        onResult={({ values, total, success }) => {
                          const r = { roll: values[0]+values[1], mod: statModifier(state.stats.soc??0)+commDm+notFirstDm, total, success }
                          setResults(rv => ({ ...rv, commission: r }))
                          actions.rollCommission(success)
                          if (isFirstGradMilitary) actions.markGradBenefitUsed('commission')
                          if (success) applyRankBonus(1)
                        }}
                        onNext={() => setSub(SUB.SURVIVAL)}
                      />
                    )}
                    <button className="btn btn-ghost" style={{ alignSelf:'flex-start' }}
                      onClick={() => setSub(SUB.SURVIVAL)}>건너뛰기 (사병 유지)</button>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ── 생존 굴림 ── */}
      {sub === SUB.SURVIVAL && (
        <div className="card">
          <div className="card-title">
            생존 굴림 — {STAT_KO[specialty?.survival.stat ?? 'end']} {specialty?.survival.target}+
            <span className="card-title-en">SURVIVAL</span>
          </div>
          <p className="text-muted" style={{ fontSize:'0.82rem', marginBottom:'1rem' }}>
            실패 시 사고 표를 굴리고 경력이 강제 종료됩니다.
            현재 {STAT_KO[specialty?.survival.stat ?? 'end']}:{' '}
            <strong style={{ color:'var(--col-cyan)', fontFamily:'var(--font-mono)' }}>
              {state.stats[specialty?.survival.stat ?? 'end'] ?? 0}
            </strong>
          </p>
          {!results.survival && (
            <DiceRollInline
              label="생존 굴림"
              stat={STAT_KO[specialty?.survival.stat ?? 'end']}
              target={specialty?.survival.target ?? 5}
              count={2}
              mod={statModifier(state.stats[specialty?.survival.stat ?? 'end'] ?? 0)}
              breakdown={[
                { label:`${STAT_KO[specialty?.survival.stat ?? 'end']} 수정치`, value: statModifier(state.stats[specialty?.survival.stat ?? 'end'] ?? 0) },
              ].filter(b => b.value !== 0)}
              onResult={({ values, total, success }) => {
                const r = { roll: values[0]+values[1], mod: statModifier(state.stats[specialty?.survival.stat??'end']??0), total, success }
                setResults(rv => ({ ...rv, survival: r, _survivalSuccess: success }))
                actions.resolveSurvival(success)
              }}
              onNext={() => setSub(results._survivalSuccess ? SUB.EVENT : SUB.MISHAP)}
            />
          )}
        </div>
      )}

      {/* ── 사고 표 (생존 실패) ── */}
      {sub === SUB.MISHAP && (
        <div className="card" style={{ borderColor:'var(--col-red)' }}>
          <div className="card-title" style={{ color:'var(--col-red)' }}>
            사고 표 — 1D
            <span className="card-title-en">MISHAP TABLE</span>
          </div>
          {!results.mishap && (
            <DiceRollInline
              label="사고 표 굴림"
              count={1} sides={6} mod={0}
              breakdown={[]}
              variant="danger"
              onResult={({ values }) => {
                const mishapRoll = values[0]
                const mishapTable = careerEvents?.[state.currentCareer]?.mishaps ?? {}
                const mishapData = mishapTable[String(mishapRoll)] ?? { text: '부상을 입습니다.', effects: [{ type: 'injury' }] }
                setResults(r => ({ ...r, mishap: { roll: mishapRoll, data: mishapData } }))
              }}
            />
          )}
          {results.mishap && (
            <>
              {/* 사고 결과 텍스트 카드 */}
              <div style={{
                background:'rgba(224,82,82,0.07)',
                border:'1px solid rgba(224,82,82,0.3)',
                borderLeft:'3px solid var(--col-red)',
                borderRadius:'var(--radius-md)',
                padding:'0.75rem 1rem',
                marginBottom:'0.75rem',
              }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--col-red)', marginBottom:'4px' }}>
                  ⚠ 사고 표 {results.mishap.roll} — {state.currentCareer?.toUpperCase()}
                </div>
                <div style={{ fontSize:'0.92rem', color:'var(--col-text)', lineHeight:1.6 }}>
                  {results.mishap.data?.text ?? '사고가 발생합니다.'}
                </div>
              </div>
              <EventResolver
                key={`mishap-${results.mishap.roll}`}
                eventData={results.mishap.data}
                isMishap={true}
                onResolved={(log) => {
                  // keep_career effect가 있으면 경력 유지
                  const keepCareer = log?.some(l => l.tag === '경력유지')
                  const endCareer = !keepCareer
                  actions.resolveMishap([], endCareer)
                  setResults(rv => ({ ...rv, mishapResolved: true, mishapKeptCareer: keepCareer }))
                }}
              />
              {results.mishapResolved && (
                results.mishapKeptCareer ? (
                  <div style={{marginTop:'0.75rem'}}>
                    <p style={{fontSize:'0.82rem',color:'var(--col-cyan)',marginBottom:'0.5rem'}}>
                      ✓ 경력을 그만둘 필요가 없습니다. 주기를 계속합니다.
                    </p>
                    <button className="btn btn-primary" onClick={() => setSub(SUB.ADVANCEMENT)}>
                      다음 — 진급 굴림 →
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-primary" style={{marginTop:'0.75rem'}}
                    onClick={() => setSub(needAging ? SUB.AGING : SUB.END)}>
                    다음 — {needAging ? '노화 굴림 →' : '주기 종료 →'}
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* ── 사건 굴림 ── */}
      {sub === SUB.EVENT && (
        <div className="card">
          <div className="card-title">
            사건 굴림 — 2D
            <span className="card-title-en">EVENT TABLE</span>
          </div>
          {!results.event && (
            <DiceRollInline
              label="사건 표 굴림"
              count={2} mod={0}
              breakdown={[]}
              onResult={({ values, total }) => {
                const d1 = values[0], d2 = values[1]
                const evTable = careerEvents?.[state.currentCareer]?.events ?? {}
                const eventData = evTable[String(total)] ?? { text: '생활 사건이 발생합니다.', effects: [{ type: 'life_event' }] }
                setResults(r => ({ ...r, event: { d1, d2, total, data: eventData } }))
              }}
            />
          )}
          {results.event && (
            <>
              {/* 사건 결과 텍스트 카드 */}
              <div style={{
                background:'rgba(200,168,75,0.07)',
                border:'1px solid var(--col-gold-dim)',
                borderLeft:'3px solid var(--col-gold)',
                borderRadius:'var(--radius-md)',
                padding:'0.75rem 1rem',
                marginBottom:'0.75rem',
              }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--col-text-muted)', marginBottom:'4px' }}>
                  ✦ 사건 표 {results.event.d1}+{results.event.d2}={results.event.total} — {state.currentCareer?.toUpperCase()}
                </div>
                <div style={{ fontSize:'0.92rem', color:'var(--col-text)', lineHeight:1.6 }}>
                  {results.event.data?.text ?? '사건이 발생합니다.'}
                </div>
              </div>
              <EventResolver
                key={`event-${results.event.total}`}
                eventData={results.event.data}
                isMishap={false}
                onResolved={(log) => {
                  const hasAutoAdvance = log?.some(l => l.tag === '진급')
                  if (hasAutoAdvance) {
                    const newRank = Math.min(6, (state.currentRank ?? 0) + 1)
                    actions.resolveAdvancement(true, newRank)
                    applyRankBonus(newRank)
                    setResults(rv => ({ ...rv, advancement: { success: true, total: '자동', roll: 0, mod: 0 }, newRank, eventResolved: true, autoAdvance: true }))
                  } else {
                    setResults(rv => ({ ...rv, eventResolved: true, autoAdvance: false }))
                  }
                }}
              />
              {/* 사건 해결 후 다음 버튼 */}
              {results.eventResolved && (
                <div style={{marginTop:'0.75rem'}}>
                  {results.autoAdvance ? (
                    <div>
                      <p style={{fontSize:'0.82rem',color:'var(--col-green)',marginBottom:'0.5rem'}}>
                        ✦ 사건으로 자동 진급!
                      </p>
                      <button className="btn btn-primary" onClick={() => setSub(needAging ? SUB.AGING : SUB.END)}>
                        다음 — {needAging ? '노화 굴림' : '주기 종료'} →
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-primary" onClick={() => setSub(SUB.ADVANCEMENT)}>
                      다음 — 진급 굴림 →
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 진급 굴림 ── */}
      {sub === SUB.ADVANCEMENT && (() => {
        const advDm    = state._advancementDm ?? 0
        const statDm   = statModifier(state.stats[specialty?.advancement?.stat ?? 'edu'] ?? 0)
        const totalMod = statDm + advDm
        return (
          <div className="card">
            <div className="card-title">
              진급 굴림 — {STAT_KO[specialty?.advancement?.stat ?? 'edu']} {specialty?.advancement?.target}+
              <span className="card-title-en">ADVANCEMENT</span>
            </div>
            <p className="text-muted" style={{ fontSize:'0.82rem', marginBottom:'1rem' }}>
              현재 {STAT_KO[specialty?.advancement?.stat ?? 'edu']}:{' '}
              <strong style={{ color:'var(--col-cyan)', fontFamily:'var(--font-mono)' }}>
                {state.stats[specialty?.advancement?.stat ?? 'edu'] ?? 0}
              </strong>
              {advDm !== 0 && (
                <div style={{marginTop:'0.4rem',padding:'0.4rem 0.6rem',display:'inline-block',background:'rgba(200,168,75,0.07)',border:'1px solid var(--col-gold-dim)',borderRadius:'var(--radius-sm)',fontSize:'0.75rem',color:'var(--col-gold)'}}>
                  ★ 사건 보너스 — 진급 판정 {advDm > 0 ? '+' : ''}{advDm}
                </div>
              )}
            </p>
            {!results.advancement && (
              <DiceRollInline
                label="진급 굴림"
                stat={STAT_KO[specialty?.advancement?.stat ?? 'edu']}
                target={specialty?.advancement?.target ?? 7}
                count={2}
                mod={totalMod}
                breakdown={[
                  { label:`${STAT_KO[specialty?.advancement?.stat ?? 'edu']} 수정치`, value: statDm },
                  ...(advDm !== 0 ? [{ label:'사건 보너스', value: advDm }] : []),
                ].filter(b => b.value !== 0)}
                onResult={({ values, total, success }) => {
                  const rawRoll = values[0] + (values[1] ?? 0)
                  const newRank = success ? Math.min(6, (state.currentRank ?? 0) + 1) : (state.currentRank ?? 0)
                  const forcedEnd      = !success && rawRoll <= state.currentTerm
                  const forcedContinue = rawRoll === 12
                  setResults(rv => ({ ...rv, advancement: { roll:rawRoll, mod:totalMod, total, success, forcedEnd, forcedContinue }, newRank }))
                  actions.resolveAdvancement(success, newRank)
                  if (success && newRank > 0) applyRankBonus(newRank)
                }}
              />
            )}
            {results.advancement && (() => {
              const rankList = state.currentIsOfficer
                ? (career?.ranks?.officer ?? [])
                : (career?.ranks?.[state.currentSpecialty] ?? career?.ranks?.enlisted ?? career?.ranks?.all ?? [])
              const rankEntry = rankList.find(r => r.rank === results.newRank)
              return (
                <>
                  <p style={{ fontSize:'0.82rem', color: results.advancement.success ? 'var(--col-green)' : 'var(--col-text-muted)', marginBottom:'0.75rem' }}>
                    {results.advancement.success
                      ? `진급! ${state.currentIsOfficer ? '계급' : '직급'} ${results.newRank}${rankEntry?.title && rankEntry.title !== '-' ? ` — ${rankEntry.title}` : ''}`
                      : '진급 없음'}
                  </p>
                  {results.advancement.success && (
                    <div style={{marginBottom:'0.75rem'}}>
                      {rankEntry?.bonus && (
                        <div style={{padding:'0.5rem 0.75rem',marginBottom:'0.75rem',background:'rgba(200,168,75,0.07)',border:'1px solid var(--col-gold-dim)',borderRadius:'var(--radius-md)'}}>
                          <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-gold)',marginBottom:'3px'}}>
                            ✦ {state.currentIsOfficer ? '계급' : '직급'} {results.newRank} 혜택
                          </div>
                          <div style={{fontSize:'0.82rem',color:'var(--col-text)'}}>{rankEntry.bonus}</div>
                          <div style={{fontSize:'0.72rem',color:'var(--col-text-muted)',marginTop:'2px'}}>(자동으로 적용됩니다)</div>
                        </div>
                      )}
                      <div style={{fontFamily:'var(--font-mono)',fontSize:'0.68rem',color:'var(--col-cyan)',marginBottom:'0.5rem'}}>
                        ✦ 진급 보너스 — 기능 표 추가 굴림 1회
                      </div>
                      <SkillTrainingPanel
                        career={career} specialty={specialty} isFirstTerm={false}
                        onDone={(skillsGained) => {
                          actions.resolveBasicTraining(skillsGained)
                          setSub(needAging ? SUB.AGING : SUB.END)
                        }}
                      />
                    </div>
                  )}
                  {!results.advancement.success && (
                    <button className="btn btn-primary" onClick={() => setSub(needAging ? SUB.AGING : SUB.END)}>
                      다음 →
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        )
      })()}

      {/* ── 노화 굴림 ── */}
      {sub === SUB.AGING && (
        <div className="card">
          <div className="card-title">
            노화 굴림 — 2D{derived.agingDm !== 0 ? ` (DM ${derived.agingDm})` : ''}
            <span className="card-title-en">AGING</span>
          </div>
          <p className="text-muted" style={{ fontSize:'0.82rem', marginBottom:'1rem' }}>
            {state.age}세. 34세 이상이므로 노화 판정을 합니다. 결과에 따라 신체 특성치가 감소합니다.
          </p>
          <DiceRollInline
            label="노화 굴림"
            count={2}
            mod={derived.agingDm}
            breakdown={derived.agingDm !== 0 ? [{ label:'의료 기술 보너스', value: derived.agingDm }] : []}
            onResult={({ values, total }) => {
              const agingEntry = getAgingResult(total)
              const res = { roll: values[0]+values[1], dm: derived.agingDm, total, entry: agingEntry }
              setResults(rv => ({ ...rv, aging: res }))
              actions.resolveAging(agingEntry.effects ?? [])
            }}
            onNext={() => setSub(SUB.END)}
          />
        </div>
      )}

      {sub === SUB.END && (
        <div className="card">
          <div className="card-title">
            주기 완료 — 다음 행동을 선택하세요
            <span className="card-title-en">TERM COMPLETE</span>
          </div>
          <div style={{ fontSize:'0.82rem', color:'var(--col-text-muted)', marginBottom:'1rem' }}>
            {state.currentTerm}주기 완료. 나이: {state.age + 4}세가 됩니다.
          </div>

          {/* 강제 유지: 진급 결괏값 12 */}
          {results.advancement?.forcedContinue && (
            <div style={{padding:'0.6rem 0.8rem',marginBottom:'0.75rem',background:'rgba(200,168,75,0.08)',border:'1px solid var(--col-gold-dim)',borderRadius:'var(--radius-md)',fontSize:'0.82rem',color:'var(--col-gold)'}}>
              ✦ 진급 결괏값 12 — 너무 귀한 인재라 경력을 반드시 계속해야 합니다!
            </div>
          )}

          {/* 강제 종료: 진급 결괏값 ≤ 현재 주기 수 */}
          {results.advancement?.forcedEnd && (
            <div style={{padding:'0.6rem 0.8rem',marginBottom:'0.75rem',background:'rgba(224,82,82,0.07)',border:'1px solid rgba(224,82,82,0.3)',borderRadius:'var(--radius-md)',fontSize:'0.82rem',color:'var(--col-red)'}}>
              ⚠ 진급 결괏값({results.advancement.roll}) ≤ {state.currentTerm}주기 — 일거리가 없어져 이 경력을 계속할 수 없습니다.
            </div>
          )}

          <div className="choice-group">
            {/* 강제 유지: 같은 경력만 선택 가능 */}
            {results.advancement?.forcedContinue ? (
              <button className="btn btn-primary" onClick={actions.endTermContinue}>
                경력 계속 (강제) — {state.currentTerm + 1}주기
              </button>
            ) : results.advancement?.forcedEnd ? (
              /* 강제 종료: 다른 경력 또는 은퇴만 */
              <>
                <button className="btn btn-primary" onClick={actions.endTermChange}>
                  다른 경력으로 전환
                </button>
                <button className="btn btn-ghost" onClick={actions.endTermRetire}>
                  은퇴 → 완성 단계
                </button>
              </>
            ) : (
              /* 일반: 자유 선택 */
              <>
                <button className="btn btn-primary" onClick={actions.endTermContinue}>
                  같은 경력 계속 ({state.currentTerm + 1}주기)
                </button>
                <button className="btn" onClick={actions.endTermChange}>
                  다른 경력으로 전환
                </button>
                <button className="btn btn-ghost" onClick={actions.endTermRetire}>
                  은퇴 → 완성 단계
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 기초 훈련 패널 ──────────────────────────────────────────
const STAT_KO2 = { str:'근력',dex:'민첩',end:'인내',int:'지능',edu:'교육',soc:'지위' }

function SkillTrainingPanel({ career, specialty, isFirstTerm, onDone }) {
  const { state, actions } = useCharacterContext()
  const [tableChoice, setTableChoice] = useState(null)
  const [rollResult, setRollResult]   = useState(null)

  // 기능 표 목록 구성
  const tables = [
    { key: 'personal', label: '자기 개발', skills: career?.skillTables?.personal ?? [] },
    { key: 'service',  label: '직무 관련', skills: career?.skillTables?.service ?? [] },
    ...(career?.skillTables?.advanced ? [{ key: 'advanced', label: '상급 교육', skills: career.skillTables.advanced, minEdu: 8 }] : []),
    { key: `specialist_${specialty?.id}`, label: `직종: ${specialty?.name}`, skills: career?.skillTables?.[`specialist_${specialty?.id}`] ?? [] },
    ...(career?.skillTables?.officer ? [{ key: 'officer', label: '장교 전용', skills: career.skillTables.officer }] : []),
  ].filter(t => t.skills && t.skills.length > 0)

  // 첫 주기: 직종 기능 모두 레벨 0으로
  if (isFirstTerm) {
    const specialtySkills = (career?.skillTables?.[`specialist_${specialty?.id}`] ?? [])
      .filter(s => !s.includes('+'))
      .map(s => ({ skill: s, level: 0 }))

    return (
      <div className="card">
        <div className="card-title">
          기초 훈련 — 첫 주기
          <span className="card-title-en">BASIC TRAINING</span>
        </div>
        <p className="text-muted" style={{ fontSize:'0.82rem', marginBottom:'1rem' }}>
          첫 주기에는 직종별 기능 표의 모든 기능을 레벨 0으로 습득합니다.
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginBottom:'1rem' }}>
          {specialtySkills.map(({ skill }) => (
            <span key={skill} className="badge badge-cyan">{skill} 0</span>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => onDone(specialtySkills)}>
          기초 훈련 완료 →
        </button>
      </div>
    )
  }

  // 2주기 이후: 기능 표 선택 + 주사위 굴림
  const doRoll = () => {
    const tbl = tables.find(t => t.key === tableChoice)
    if (!tbl) return
    const idx = Math.floor(Math.random() * 6)  // 1D6 결과 (0-based)
    const raw = tbl.skills[idx]
    setRollResult({ idx: idx + 1, raw, table: tbl.label })
  }

  // +1 특성치 처리
  const isStatBoost = rollResult?.raw?.includes('+')
  const statKey     = isStatBoost ? rollResult.raw.replace('+1','').replace('+','').trim().toLowerCase() : null

  const applyResult = (finalSkill) => {
    if (isStatBoost) {
      const key = statKey
      actions.applyStatChange(key, 1)
    } else {
      actions.applySkill(finalSkill, 1)
    }
    onDone([])
  }

  return (
    <div className="card">
      <div className="card-title">
        기능 표 굴림
        <span className="card-title-en">SKILL TABLE</span>
      </div>
      <p className="text-muted" style={{ fontSize:'0.82rem', marginBottom:'1rem' }}>
        기능 표 하나를 선택하고 1D를 굴려 기능을 습득합니다.
        상급 교육 표는 교육 특성치 8 이상일 때만 선택 가능합니다.
      </p>

      {/* 표 선택 */}
      {!rollResult && (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'1rem' }}>
            {tables.map(t => {
              const locked = t.minEdu && (state.stats.edu ?? 0) < t.minEdu
              return (
                <label key={t.key} style={{
                  display:'flex', alignItems:'flex-start', gap:'0.75rem',
                  padding:'0.75rem', borderRadius:'var(--radius-md)',
                  border:`1px solid ${tableChoice === t.key ? 'var(--col-gold)' : 'var(--col-border)'}`,
                  background: tableChoice === t.key ? 'rgba(200,168,75,0.06)' : 'var(--col-deep)',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.45 : 1,
                }}>
                  <input type="radio" name="table" value={t.key}
                    checked={tableChoice === t.key}
                    onChange={() => !locked && setTableChoice(t.key)}
                    style={{ marginTop:'2px' }}
                    disabled={locked}
                  />
                  <div>
                    <div style={{ fontSize:'0.85rem', fontWeight:500, color: tableChoice === t.key ? 'var(--col-gold)' : 'var(--col-text)' }}>
                      {t.label}
                      {locked && <span className="badge badge-muted" style={{ marginLeft:'0.5rem' }}>교육 {t.minEdu}+ 필요</span>}
                    </div>
                    <div style={{ display:'flex', gap:'0.3rem', flexWrap:'wrap', marginTop:'0.3rem' }}>
                      {t.skills.map((s, i) => (
                        <span key={i} style={{ fontSize:'0.65rem', color:'var(--col-text-muted)', fontFamily:'var(--font-mono)' }}>
                          {i+1}.{s}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
          {tableChoice && (
            <DiceRollInline
              label={`기능 표 굴림 — 1D (${tables.find(t=>t.key===tableChoice)?.label})`}
              count={1} sides={6} mod={0}
              onResult={({ values }) => {
                const tbl = tables.find(t => t.key === tableChoice)
                const idx = values[0] - 1
                const raw = tbl?.skills[idx] ?? '생존'
                setRollResult({ idx: values[0], raw, table: tbl?.label ?? '' })
              }}
            />
          )}
          {!tableChoice && (
            <p style={{ fontSize:'0.78rem', color:'var(--col-text-dim)', fontFamily:'var(--font-mono)' }}>
              ↑ 기능 표를 먼저 선택하세요
            </p>
          )}
        </>
      )}

      {/* 굴림 결과 */}
      {rollResult && (
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.8rem', color:'var(--col-text-muted)', marginBottom:'0.5rem' }}>
            표: {rollResult.table} · 1D: {rollResult.idx}
          </div>
          {isStatBoost ? (
            <div>
              <p style={{ fontSize:'0.88rem', color:'var(--col-green)', marginBottom:'0.75rem' }}>
                {STAT_KO2[statKey] ?? statKey} +1 획득!
              </p>
              <button className="btn btn-primary" onClick={() => applyResult(null)}>적용 →</button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:'0.88rem', color:'var(--col-cyan)', marginBottom:'0.75rem' }}>
                기능 획득: <strong>{rollResult.raw}</strong>
              </p>
              <button className="btn btn-primary" onClick={() => applyResult(rollResult.raw)}>
                {rollResult.raw} +1레벨 적용 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 굴림 결과 표시 ──────────────────────────────────────────
function RollResult({ result, label }) {
  return (
    <div className={`roll-result ${result.success ? 'success' : 'failure'}`}>
      <div className={`roll-total ${result.success ? 'success' : 'failure'}`}>{result.total}</div>
      <div className="roll-detail">
        {label}<br />
        2D({result.roll}) + DM({result.mod ?? 0}) = {result.total} → {result.success ? '성공' : '실패'}
      </div>
    </div>
  )
}
