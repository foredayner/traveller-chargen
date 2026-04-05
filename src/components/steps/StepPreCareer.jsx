// StepPreCareer.jsx — Step 3: 경력 전 교육
// 룰북 p.14: 3주기까지 입학 가능, 입학 후 기능 선택 + 사건 굴림 + 졸업 굴림
import { useState, useEffect } from 'react'
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import { DiceRollInline } from '../DiceAnimator.jsx'
import { loadEventsData } from '../../data/eventsData.js'
import EventResolver from '../EventResolver.jsx'

// 수정치 계산
const MOD = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]
const sm = (v) => MOD[Math.min(15,Math.max(0,v??0))]??0

const UNIV_SKILLS = [
  '기계공학','동물(훈련)','동물(수의학)','변호','산업','언어','예술','우주 항법','의료','전자기기','항법','행정'
]

const PRE_CAREER_OPTIONS = [
  {
    id: 'university', name: '대학교', nameEn: 'University',
    desc: '지능 기반 기능에 집중. 졸업 시 교육 +2, 지위 +1.',
    check: { stat: 'int', target: 6, label: '지능 6+' },
    gradCheck: { stat: 'int', target: 8, label: '지능 8+' },
    bonus: '교육 +2, 지위 +1',
    hasEventRoll: true,
    skillSelect: true,   // 기능 선택 UI 필요
  },
  {
    id: 'army_academy', name: '육군사관학교', nameEn: 'Army Academy',
    desc: '육군 경력 특화. 졸업 시 육군 자격 자동 성공.',
    check: { stat: 'end', target: 7, label: '인내 7+' },
    gradCheck: { stat: 'end', target: 8, label: '인내 8+' },
    bonus: '육군 경력 자격 자동 성공',
    hasEventRoll: true,
    linkedCareer: 'army',
  },
  {
    id: 'marine_academy', name: '해병사관학교', nameEn: 'Marine Academy',
    desc: '해병 경력 특화. 졸업 시 해병 자격 자동 성공.',
    check: { stat: 'end', target: 8, label: '인내 8+' },
    gradCheck: { stat: 'end', target: 8, label: '인내 8+' },
    bonus: '해병 경력 자격 자동 성공',
    hasEventRoll: true,
    linkedCareer: 'marine',
  },
  {
    id: 'navy_academy', name: '해군사관학교', nameEn: 'Naval Academy',
    desc: '해군 경력 특화. 졸업 시 해군 자격 자동 성공.',
    check: { stat: 'int', target: 8, label: '지능 8+' },
    gradCheck: { stat: 'int', target: 8, label: '지능 8+' },
    bonus: '해군 경력 자격 자동 성공',
    hasEventRoll: true,
    linkedCareer: 'navy',
  },
]

export default function StepPreCareer() {
  const { state, actions } = useCharacterContext()
  const [selected,     setSelected]     = useState(null)
  const [entryResult,  setEntryResult]  = useState(null)
  const [skillPicked0, setSkillPicked0] = useState('')   // 대학교 기능 레벨 0
  const [skillPicked1, setSkillPicked1] = useState('')   // 대학교 기능 레벨 1
  const [eventData,    setEventData]    = useState(null) // 사건 표 결과
  const [eventResolved,setEventResolved]= useState(false)
  const [gradResult,   setGradResult]   = useState(null)
  const [careerEvents, setCareerEvents] = useState(null)
  const [phase, setPhase]              = useState('entry') // entry|skills|event|grad|done

  // 룰북: 3주기까지만 입학 가능
  const termCount = state.careers.length
  const canEnroll = termCount < 3

  useEffect(() => {
    loadEventsData().then(d => setCareerEvents(d))
  }, [])

  const option = PRE_CAREER_OPTIONS.find(o => o.id === selected)

  // 입학 성공 → 다음 단계
  const afterEntry = (success) => {
    if (!success) { setPhase('entry'); return }
    if (option?.skillSelect) setPhase('skills')
    else setPhase('event')
  }

  // 기능 선택 완료 → 사건
  const afterSkills = () => {
    if (skillPicked0) actions.applySkill(skillPicked0, 0)
    if (skillPicked1) actions.applySkill(skillPicked1, 1)
    // 교육 +1 (입학 즉시)
    actions.applyStatChange('edu', 1)
    setPhase('event')
  }

  // 사건 굴림
  const rollEvent = () => {
    const roll1 = Math.floor(Math.random()*6)+1
    const roll2 = Math.floor(Math.random()*6)+1
    const total = roll1+roll2
    // 선택한 교육 기관 ID로 사건 표 조회 (university, army_academy 등)
    const evTable = careerEvents?.[selected]?.events ?? {}
    const ev = evTable[String(total)] ?? { text: '평온한 학창 시절을 보냅니다.', effects: [] }
    setEventData({ d1:roll1, d2:roll2, total, data: ev })
  }

  // 졸업 완료
  const handleConfirm = () => {
    const honors = (gradResult?.total ?? 0) >= 10
    const skillsGained = []
    // 룰북: 사관학교 졸업 실패 시 입학 결괏값(수정 전 raw) 2 이하면 자동 입대 불가
    const entryRaw = entryResult?.roll ?? 12
    actions.resolvePreCareer(gradResult?.success ?? false, skillsGained, honors, entryRaw)
  }

  if (!canEnroll) {
    return (
      <div>
        <div className="step-heading">
          <h2>경력 전 교육</h2>
          <p style={{color:'var(--col-amber)'}}>4주기 이상이므로 경력 전 교육을 받을 수 없습니다.</p>
        </div>
        <button className="btn btn-primary" onClick={actions.skipPreCareer}>경력 선택으로 →</button>
      </div>
    )
  }

  return (
    <div>
      <div className="step-heading">
        <h2>경력 전 교육</h2>
        <p>
          고등 교육을 받을 기회가 있습니다. 원하지 않으면 건너뜁니다.
          {termCount > 0 && <span style={{color:'var(--col-amber)'}}> ({termCount+1}번째 주기 — 자격 DM -{termCount})</span>}
        </p>
      </div>

      {/* ── 교육 선택 ── */}
      {!selected && (
        <>
          <div className="career-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.5rem' }}>
            {PRE_CAREER_OPTIONS.map(opt => (
              <div key={opt.id} className="career-card"
                onClick={() => { setSelected(opt.id); setPhase('entry') }}>
                <div className="career-card-name">{opt.name}</div>
                <div className="career-card-req">{opt.check.label}</div>
                <p style={{ fontSize:'0.75rem', color:'var(--col-text-muted)', marginTop:'0.5rem' }}>{opt.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted" style={{fontSize:'0.78rem'}}>한 번만 선택할 수 있으며, 3주기까지 가능합니다.</span>
            <button className="btn btn-ghost" onClick={actions.skipPreCareer}>건너뛰기</button>
          </div>
        </>
      )}

      {selected && option && (
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div className="card-title">
            {option.name}
            <button className="btn btn-ghost" style={{marginLeft:'auto',fontSize:'0.7rem',padding:'2px 8px'}}
              onClick={() => { setSelected(null); setEntryResult(null); setGradResult(null); setPhase('entry') }}>
              ← 다시 선택
            </button>
          </div>

          {/* ① 입학 굴림 */}
          {phase === 'entry' && (
            <div>
              <p className="text-muted" style={{fontSize:'0.82rem',marginBottom:'0.75rem'}}>
                입학 굴림: {option.check.label}
                {termCount > 0 && ` (DM ${-termCount})`}
              </p>
              {!entryResult ? (
                <DiceRollInline
                  label={`입학 굴림 — ${option.check.label}`}
                  count={2}
                  mod={sm(state.stats[option.check.stat]) - termCount}
                  target={option.check.target}
                  onResult={({ values, total, success }) => {
                    const mod = sm(state.stats[option.check.stat]) - termCount
                    setTimeout(() => {
                      setEntryResult({ roll: values[0]+values[1], mod, total, success })
                      afterEntry(success)
                    }, 700)
                  }}
                />
              ) : (
                <>
                  <div className={`roll-result ${entryResult.success ? 'success' : 'failure'}`} style={{marginBottom:'0.75rem'}}>
                    <div className={`roll-total ${entryResult.success ? 'success' : 'failure'}`}>{entryResult.total}</div>
                    <div className="roll-detail">
                      2D({entryResult.roll}) + DM({entryResult.mod}) = {entryResult.total}<br/>
                      {entryResult.success ? '✓ 입학 성공!' : '✗ 입학 실패'}
                    </div>
                  </div>
                  {!entryResult.success && (
                    <button className="btn btn-primary" onClick={actions.skipPreCareer}>경력 선택으로 →</button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ② 기능 선택 (대학교만) */}
          {phase === 'skills' && option.skillSelect && (
            <div>
              <p className="text-muted" style={{fontSize:'0.82rem',marginBottom:'0.75rem'}}>
                입학 성공! 기능 2개를 선택합니다 — 하나는 레벨 0, 하나는 레벨 1.<br/>
                교육 특성치 +1을 즉시 획득합니다.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div>
                  <div className="side-label" style={{marginBottom:'0.35rem'}}>레벨 0으로 습득</div>
                  <select value={skillPicked0} onChange={e=>setSkillPicked0(e.target.value)}
                    style={{width:'100%',background:'var(--col-deep)',border:'1px solid var(--col-border)',borderRadius:'var(--radius-md)',padding:'0.5rem',color:'var(--col-text)',fontFamily:'var(--font-body)',fontSize:'0.85rem'}}>
                    <option value="">-- 선택 --</option>
                    {UNIV_SKILLS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div className="side-label" style={{marginBottom:'0.35rem'}}>레벨 1로 습득</div>
                  <select value={skillPicked1} onChange={e=>setSkillPicked1(e.target.value)}
                    style={{width:'100%',background:'var(--col-deep)',border:'1px solid var(--col-border)',borderRadius:'var(--radius-md)',padding:'0.5rem',color:'var(--col-text)',fontFamily:'var(--font-body)',fontSize:'0.85rem'}}>
                    <option value="">-- 선택 --</option>
                    {UNIV_SKILLS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn btn-primary"
                disabled={!skillPicked0 || !skillPicked1 || skillPicked0 === skillPicked1}
                onClick={afterSkills}>
                기능 확정 → 사건 굴림
              </button>
              {skillPicked0 === skillPicked1 && skillPicked0 &&
                <p style={{color:'var(--col-red)',fontSize:'0.78rem',marginTop:'0.5rem'}}>같은 기능은 선택할 수 없습니다.</p>}
            </div>
          )}

          {/* ③ 사건 굴림 */}
          {phase === 'event' && (
            <div>
              <p className="text-muted" style={{fontSize:'0.82rem',marginBottom:'0.75rem'}}>
                재학 중 사건 굴림을 합니다.
              </p>
              {!eventData ? (
                <button className="btn btn-primary" onClick={rollEvent}>🎲 사건 굴림 (2D)</button>
              ) : (
                <>
                  <div style={{
                    background:'rgba(200,168,75,0.07)',border:'1px solid var(--col-gold-dim)',
                    borderLeft:'3px solid var(--col-gold)',borderRadius:'var(--radius-md)',
                    padding:'0.75rem 1rem',marginBottom:'0.75rem'
                  }}>
                    <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',marginBottom:'4px'}}>
                      ✦ 사건 표 {eventData.d1}+{eventData.d2}={eventData.total}
                    </div>
                    <div style={{fontSize:'0.9rem',color:'var(--col-text)',lineHeight:1.6}}>
                      {eventData.data?.text}
                    </div>
                  </div>
                  {!eventResolved ? (
                    <EventResolver
                      key={`precareer-event-${eventData.total}`}
                      eventData={eventData.data}
                      isMishap={false}
                      onResolved={() => { setEventResolved(true); setPhase('grad') }}
                    />
                  ) : null}
                </>
              )}
            </div>
          )}

          {/* ④ 졸업 굴림 */}
          {phase === 'grad' && (
            <div>
              <p className="text-muted" style={{fontSize:'0.82rem',marginBottom:'0.75rem'}}>
                졸업 판정을 합니다. 실패해도 재학 중 기능은 유지됩니다.
              </p>
              {!gradResult ? (
                <DiceRollInline
                  label={`졸업 굴림 — ${option.gradCheck.label}`}
                  count={2}
                  mod={sm(state.stats[option.gradCheck.stat])}
                  target={option.gradCheck.target}
                  onResult={({ values, total, success }) => {
                    const mod = sm(state.stats[option.gradCheck.stat])
                    setTimeout(() => setGradResult({ roll: values[0]+values[1], mod, total, success }), 700)
                  }}
                />
              ) : (
                <>
                  <div className={`roll-result ${gradResult.success ? 'success' : 'failure'}`} style={{marginBottom:'0.75rem'}}>
                    <div className={`roll-total ${gradResult.success ? 'success' : 'failure'}`}>{gradResult.total}</div>
                    <div className="roll-detail">
                      {gradResult.success
                        ? gradResult.total >= 10
                          ? `✦ 우등 졸업! 소득: ${option.bonus} + 추가 혜택`
                          : `졸업 성공! 소득: ${option.bonus}`
                        : '졸업 실패 (기능은 유지)'}
                      {gradResult.success && option.id === 'university' && (
                        <div style={{marginTop:'0.4rem',fontSize:'0.78rem',color:'var(--col-cyan)'}}>
                          {gradResult.total >= 10
                            ? '자격 굴림 +2, 임관 굴림 +2, 교육 추가 +1'
                            : '자격 굴림 +1, 임관 굴림 가능'}
                        </div>
                      )}
                      {gradResult.success && option.id !== 'university' && (
                        <div style={{marginTop:'0.4rem',fontSize:'0.78rem',color:'var(--col-cyan)'}}>
                          {gradResult.total >= 10
                            ? '연계 경력 자격 자동 성공, 임관 자동 성공, 지위 +1'
                            : '연계 경력 자격 자동 성공, 임관 굴림 +2'}
                        </div>
                      )}
                      {!gradResult.success && option.id !== 'university' && entryResult?.total >= 3 && (
                        <div style={{marginTop:'0.4rem',fontSize:'0.78rem',color:'var(--col-amber)'}}>
                          졸업은 실패했지만 연계 경력 자동 입대는 가능합니다.
                        </div>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleConfirm}>
                    다음 — 경력 선택 →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
