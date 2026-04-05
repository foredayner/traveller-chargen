// StepCareer.jsx — Step 4: 경력 선택 + 자격 굴림
import { useState } from 'react'
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import { statModifier } from '../../utils/dice.js'
import careersData from '../../data/careersData.js'
import { DiceRollInline } from '../DiceAnimator.jsx'

// 징병 표 (1D 결과 순서)
const DRAFT_TABLE = ['navy', 'army', 'marine', 'merchant', 'scout', 'agent']

// 징병 경력별 설명
const DRAFT_DESC = {
  navy:     '제국 해군에 입대합니다. 별들 사이를 순찰하며 외세와 무법자들로부터 제국을 수호합니다.',
  army:     '행성 육군에 입대합니다. 행성 표면 전투와 방어 임무를 수행합니다.',
  marine:   '해병대에 입대합니다. 우주선 간 전투와 선상 전투 임무를 수행합니다.',
  merchant: '상선단에 배정됩니다. 성간 무역로를 항해하며 화물과 승객을 수송합니다.',
  scout:    '정찰대에 배정됩니다. 미지의 항성계를 탐험하고 정보를 수집합니다.',
  agent:    '법 집행 기관에 배정됩니다. 치안 유지와 범죄 수사를 담당합니다.',
}

export default function StepCareer() {
  const { state, actions } = useCharacterContext()
  const [qualResult, setQualResult] = useState(null)
  const [showDraft, setShowDraft] = useState(false)
  const [draftResult, setDraftResult] = useState(null)

  const { currentCareer, currentSpecialty, careers, hasDrafted, pendingEvent } = state
  const prevCareerCount = careers.length
  const career = careersData[currentCareer]

  // 사고로 경력이 종료됐는지 감지
  const lastTerm = careers.at(-1)
  const cameFromMishap = lastTerm?.survived === false

  // 징병
  const handleDraft = () => {
    const roll = roll1D()
    const careerId = DRAFT_TABLE[roll - 1]
    // 징병된 경력의 첫 번째 직종 자동 선택
    const defaultSpecialty = careersData[careerId]?.specialties?.[0]?.id ?? null
    setDraftResult({ roll, careerId })
    actions.acceptDraft(careerId, defaultSpecialty)
  }

  // 방랑자 선택
  const handleDrifter = () => {
    actions.selectCareer('drifter')
    actions.selectSpecialty('wanderer')
    actions.resolveQualRoll(true)
  }

  if (pendingEvent?.type === 'qual_failed') {
    return (
      <div>
        <div className="step-heading">
          <h2>자격 굴림 실패</h2>
          <p>
            <strong style={{ color: 'var(--col-gold)' }}>{career?.name}</strong> 경력의 자격 굴림에 실패했습니다.
            징병되거나 방랑자가 되어야 합니다.
          </p>
        </div>
        <div className="choice-group">
          {!hasDrafted && (
            <DiceRollInline
              label="징병 굴림 — 1D"
              count={1} sides={6} mod={0}
              variant="danger"
              onResult={({ values }) => {
                const roll = values[0]
                const careerId = DRAFT_TABLE[roll - 1]
                const defaultSpecialty = careersData[careerId]?.specialties?.[0]?.id ?? null
                setTimeout(() => {
                  setDraftResult({ roll, careerId })
                  actions.acceptDraft(careerId, defaultSpecialty)
                }, 700)
              }}
            />
          )}
          {!draftResult && (
            <button className="btn btn-ghost" onClick={handleDrifter}>
              방랑자로 경력 시작
            </button>
          )}
        </div>
        {draftResult && (
          <div style={{
            padding:'1rem', marginTop:'0.75rem',
            background:'rgba(224,82,82,0.07)',
            border:'1px solid rgba(224,82,82,0.3)',
            borderLeft:'3px solid var(--col-red)',
            borderRadius:'var(--radius-md)',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'var(--col-red)', marginBottom:'0.5rem' }}>
              ⚔ 징병 1D: {draftResult.roll}
            </div>
            <div style={{ fontSize:'0.92rem', color:'var(--col-text)', marginBottom:'0.35rem' }}>
              <strong style={{ color:'var(--col-gold)' }}>{careersData[draftResult.careerId]?.name}</strong> 경력으로 징병되었습니다.
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--col-text-muted)', marginBottom:'0.75rem' }}>
              {DRAFT_DESC[draftResult.careerId] ?? '군 복무를 시작합니다. 다음 경력 주기 진행으로 이어집니다.'}
            </div>
            <button className="btn btn-primary" onClick={actions.startTerm}>
              경력 주기 시작 →
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="step-heading">
        <h2>경력 선택</h2>
        <p>
          {cameFromMishap
            ? <span style={{color:'var(--col-amber)'}}>
                사고로 경력이 종료됐습니다. 이전 {prevCareerCount - 1}주기의 소득은 유지됩니다.
                새 경력을 시작하거나 은퇴해 소득을 정산하세요.
              </span>
            : prevCareerCount > 0
              ? `현재 ${prevCareerCount}번의 주기를 수행했습니다. 새로운 경력에 도전하거나 은퇴할 수 있습니다.`
              : '첫 번째 경력을 선택합니다. 자격 굴림에 성공해야 입대할 수 있습니다.'}
        </p>
      </div>

      {/* 경력 그리드 */}
      <div className="career-grid">
        {Object.entries(careersData).map(([id, c]) => {
          const gb = state.gradBenefits
          const isAutoQual   = !gb.usedAutoQual && gb.autoQual === id
          const isEligibleDm = !gb.usedQualDm && gb.qualDm > 0 && gb.qualEligible?.includes(id)  // 대학교 DM 별도
          return (
            <div
              key={id}
              className={`career-card ${currentCareer === id ? 'selected' : ''} ${isAutoQual ? 'career-card--highlight' : ''}`}
              onClick={() => { actions.selectCareer(id); setQualResult(null) }}
            >
              <div className="career-card-name">{c.name}</div>
              <div className="career-card-req">
                {isAutoQual
                  ? <span style={{color:'var(--col-green)',fontWeight:500}}>✓ 자격 자동 성공 (사관학교)</span>
                  : c.qualification.stat
                    ? `자격: ${c.qualification.stat.toUpperCase()} ${c.qualification.target}+`
                    : '자격: 자동 성공'}
              </div>
              {isEligibleDm && (
                <div style={{marginTop:'3px',fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:'var(--col-gold)'}}>
                  ✦ 졸업 혜택 자격 DM +{gb.qualDm}
                </div>
              )}
              {isAutoQual && gb.canCommission && (
                <div style={{marginTop:'3px',fontFamily:'var(--font-mono)',fontSize:'0.62rem',color:'var(--col-cyan)'}}>
                  임관 굴림 {gb.commissionDm === 99 ? '자동 성공' : `DM +${gb.commissionDm}`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 경력 상세 정보 패널 ── */}
      {currentCareer && career && (
        <div className="card mt-md" style={{ borderColor:'var(--col-gold-dim)' }}>
          <div className="card-title">
            {career.name} — 경력 상세
            <span className="card-title-en">CAREER DETAIL</span>
          </div>

          {/* 경력 설명 */}
          {career.description && (
            <p style={{ fontSize:'0.84rem', color:'var(--col-text-muted)', marginBottom:'1rem', lineHeight:1.6 }}>
              {career.description}
            </p>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {/* 직종별 생존/진급 */}
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--col-text-dim)', letterSpacing:'0.1em', marginBottom:'0.5rem' }}>
                직종 / 생존 / 진급
              </div>
              {career.specialties.map(sp => (
                <div key={sp.id}
                  onClick={() => actions.selectSpecialty(sp.id)}
                  style={{
                    padding:'0.4rem 0.6rem', marginBottom:'4px',
                    border:`1px solid ${currentSpecialty===sp.id?'var(--col-gold)':'var(--col-border)'}`,
                    borderRadius:'var(--radius-sm)',
                    background: currentSpecialty===sp.id?'rgba(200,168,75,0.06)':'var(--col-deep)',
                    fontSize:'0.78rem', cursor:'pointer', transition:'all 0.15s',
                  }}>
                  <span style={{ color:currentSpecialty===sp.id?'var(--col-gold)':'var(--col-text)', fontWeight:500 }}>{sp.name}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--col-text-muted)', marginLeft:'0.5rem' }}>
                    생존 {sp.survival.stat.toUpperCase()}{sp.survival.target}+ · 진급 {sp.advancement.stat.toUpperCase()}{sp.advancement.target}+
                  </span>
                  {currentSpecialty===sp.id && <span style={{ marginLeft:'0.5rem', color:'var(--col-gold)', fontSize:'0.65rem' }}>✓ 선택됨</span>}
                </div>
              ))}
            </div>

            {/* 퇴직 소득 표 미리보기 */}
            <div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--col-text-dim)', letterSpacing:'0.1em', marginBottom:'0.5rem' }}>
                퇴직 소득 표
              </div>
              <div style={{ fontSize:'0.7rem', fontFamily:'var(--font-mono)', display:'grid', gridTemplateColumns:'auto 1fr 1fr', gap:'2px 8px' }}>
                <span style={{ color:'var(--col-text-dim)' }}>1D</span>
                <span style={{ color:'var(--col-text-muted)' }}>현금</span>
                <span style={{ color:'var(--col-text-muted)' }}>소득</span>
                {Array.from({ length:7 }, (_,i) => [
                  <span key={`n${i}`} style={{ color:'var(--col-text-dim)' }}>{i+1}</span>,
                  <span key={`c${i}`} style={{ color:'var(--col-gold)', fontSize:'0.65rem' }}>
                    Cr {(career.mustering?.cash?.[i]??0).toLocaleString()}
                  </span>,
                  <span key={`b${i}`} style={{ color:'var(--col-cyan)', fontSize:'0.65rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {career.mustering?.benefits?.[i]??'—'}
                  </span>,
                ])}
              </div>
            </div>
          </div>

          {/* 기능과 훈련 표 — 공통 + 직종별 */}
          <div style={{ marginTop:'1rem' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color:'var(--col-text-dim)', letterSpacing:'0.1em', marginBottom:'0.5rem' }}>
              기능과 훈련 표
            </div>
            {/* 공통 표: 자기개발, 직무관련, 상급교육, 장교전용 */}
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginBottom:'0.75rem' }}>
              {[
                { key:'personal', label:'자기 개발' },
                { key:'service',  label:'직무 관련' },
                { key:'advanced', label:'상급 교육', note:'교육 8+' },
                ...(career.skillTables?.officer ? [{ key:'officer', label:'장교 전용', note:'장교만' }] : []),
              ].filter(t => career.skillTables?.[t.key]).map(t => (
                <div key={t.key} style={{
                  background:'var(--col-deep)', border:'1px solid var(--col-border)',
                  borderRadius:'var(--radius-sm)', padding:'0.4rem 0.6rem', minWidth:'110px',
                }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--col-text-dim)', marginBottom:'3px' }}>
                    {t.label}{t.note && <span style={{color:'var(--col-amber)',marginLeft:'4px'}}>({t.note})</span>}
                  </div>
                  {career.skillTables[t.key].map((s,i) => (
                    <div key={i} style={{ fontSize:'0.65rem', color:'var(--col-text-muted)' }}>
                      <span style={{ color:'var(--col-text-dim)', marginRight:'3px' }}>{i+1}.</span>{s}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {/* 직종별 표 */}
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.62rem', color:'var(--col-text-dim)', letterSpacing:'0.08em', marginBottom:'0.4rem' }}>
              직종별 기능 표
            </div>
            <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
              {career.specialties.map(sp => {
                const spKey = `specialist_${sp.id}`
                const spSkills = career.skillTables?.[spKey] ?? []
                const isSelected = currentSpecialty === sp.id
                return (
                  <div key={sp.id}
                    onClick={() => actions.selectSpecialty(sp.id)}
                    style={{
                      background: isSelected ? 'rgba(200,168,75,0.06)' : 'var(--col-deep)',
                      border: `1px solid ${isSelected ? 'var(--col-gold)' : 'var(--col-border)'}`,
                      borderRadius:'var(--radius-sm)', padding:'0.4rem 0.6rem', minWidth:'110px',
                      cursor:'pointer', transition:'all 0.15s',
                    }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color: isSelected ? 'var(--col-gold)' : 'var(--col-text-dim)', marginBottom:'2px', fontWeight: isSelected ? 600 : 400 }}>
                      {sp.name} {isSelected && '✓'}
                    </div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.55rem', color:'var(--col-text-dim)', marginBottom:'4px' }}>
                      생존 {sp.survival.stat.toUpperCase()}{sp.survival.target}+ · 진급 {sp.advancement.stat.toUpperCase()}{sp.advancement.target}+
                    </div>
                    {spSkills.length > 0
                      ? spSkills.map((s,i) => (
                          <div key={i} style={{ fontSize:'0.65rem', color:'var(--col-text-muted)' }}>
                            <span style={{ color:'var(--col-text-dim)', marginRight:'3px' }}>{i+1}.</span>{s}
                          </div>
                        ))
                      : <div style={{ fontSize:'0.65rem', color:'var(--col-text-dim)' }}>직종 표 없음</div>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}


      {/* 자격 굴림 */}
      {currentCareer && currentSpecialty && (() => {
        const gb = state.gradBenefits
        const isLinkedCareer = gb.autoQual === currentCareer
        const isEligible = gb.qualEligible?.includes(currentCareer)
        const gradDm  = (!gb.usedQualDm && gb.qualDm > 0 && isEligible && !isLinkedCareer) ? gb.qualDm : 0
        const eventDm = state._nextQualDm ?? 0
        const qualDm  = gradDm + eventDm
        const autoQualThisTerm = !gb.usedAutoQual && isLinkedCareer && gb.autoQual

        return (
          <div className="card mt-md">
            <div className="card-title">
              자격 굴림
              {gradDm > 0 && <span style={{marginLeft:'0.5rem',color:'var(--col-gold)',fontSize:'0.72rem',fontFamily:'var(--font-mono)'}}>졸업 혜택 DM +{gradDm}</span>}
              {eventDm > 0 && <span style={{marginLeft:'0.5rem',color:'var(--col-cyan)',fontSize:'0.72rem',fontFamily:'var(--font-mono)'}}>사건 DM +{eventDm}</span>}
              {autoQualThisTerm && (() => {
              const schoolNames = { army_academy:'육군사관학교', marine_academy:'해병사관학교', navy_academy:'해군사관학교' }
              return <span style={{marginLeft:'0.5rem',color:'var(--col-green)',fontSize:'0.72rem',fontFamily:'var(--font-mono)'}}>✓ 자격 자동 성공 ({schoolNames[state.preCareer] ?? '사관학교'} 졸업)</span>
            })()}
            </div>
            {!qualResult ? (
              autoQualThisTerm ? (
                <div>
                  <p style={{fontSize:'0.82rem',color:'var(--col-green)',marginBottom:'0.5rem'}}>
                    ✓ 자격 자동 성공
                  </p>
                  <div style={{padding:'0.5rem 0.75rem',background:'rgba(78,205,196,0.07)',border:'1px solid rgba(78,205,196,0.25)',borderRadius:'var(--radius-md)',fontSize:'0.78rem',color:'var(--col-text)',marginBottom:'0.75rem'}}>
                    {(() => {
                      const schoolNames = { army_academy:'육군사관학교', marine_academy:'해병사관학교', navy_academy:'해군사관학교' }
                      return <><strong style={{color:'var(--col-cyan)'}}>{schoolNames[state.preCareer] ?? '사관학교'} 졸업</strong> — {careersData[currentCareer]?.name} 경력 자격 굴림이 자동으로 성공합니다.</>
                    })()}
                  </div>
                  <button className="btn btn-primary" onClick={() => {
                    setQualResult({ total: '자동', success: true })
                    actions.resolveQualRoll(true)
                    actions.markGradBenefitUsed('autoQual')
                  }}>
                    자동 입대 →
                  </button>
                </div>
              ) : career.qualification.stat ? (
                <DiceRollInline
                  label={`자격 굴림 — ${career.qualification.stat.toUpperCase()} ${career.qualification.target}+${
                    prevCareerCount > 0 ? ` (경력 DM ${-prevCareerCount})` : ''}${
                    qualDm > 0 ? ` (보너스 DM +${qualDm})` : ''}`}
                  count={2}
                  mod={statModifier(state.stats[
                    career.qualification.stat === 'dex_or_int'
                      ? (state.stats.dex >= state.stats.int ? 'dex' : 'int')
                      : career.qualification.stat
                  ] ?? 0) - prevCareerCount + qualDm}
                  target={career.qualification.target}
                  onResult={({ values, total, success }) => {
                    setQualResult({ total, success })
                    actions.resolveQualRoll(success)
                    if (gradDm > 0) actions.markGradBenefitUsed('qualDm')
                    if (eventDm > 0) actions.clearNextQualDm()
                  }}
                />
              ) : (
                <button className="btn btn-primary" onClick={() => {
                  setQualResult({ total: null, success: true })
                  actions.resolveQualRoll(true)
                }}>
                  자동 성공 — 시작
                </button>
              )
            ) : (
              <>
                <div className={`roll-result ${qualResult.success ? 'success' : 'failure'}`}>
                  <div className={`roll-total ${qualResult.success ? 'success' : 'failure'}`}>
                    {qualResult.total ?? '자동'}
                  </div>
                  <div className="roll-detail">
                    {qualResult.success ? '입대 성공!' : '입대 실패 — 징병 또는 방랑자 선택'}
                  </div>
                </div>
                {qualResult.success && (
                  <button className="btn btn-primary mt-md" onClick={actions.startTerm}>
                    다음 — 경력 주기 시작 →
                  </button>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* 경력 전교육 재진입 (3주기 미만) */}
      {prevCareerCount < 3 && prevCareerCount > 0 && !state.preCareerSuccess && (
        <div style={{
          marginTop:'1rem', padding:'0.75rem 1rem',
          background:'rgba(78,205,196,0.05)',
          border:'1px solid rgba(78,205,196,0.25)',
          borderRadius:'var(--radius-md)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.5rem',
        }}>
          <div>
            <div style={{fontSize:'0.82rem',color:'var(--col-cyan)',fontWeight:500,marginBottom:'2px'}}>
              경력 전 교육 기회
            </div>
            <div style={{fontSize:'0.72rem',color:'var(--col-text-muted)'}}>
              아직 {3 - prevCareerCount}번의 주기를 남겨두고 대학교나 사관학교에 입학할 수 있습니다.
            </div>
          </div>
          <button className="btn btn-ghost" style={{borderColor:'var(--col-cyan)',color:'var(--col-cyan)'}}
            onClick={actions.goPreCareer}>
            경력 전 교육 받기
          </button>
        </div>
      )}

      {/* 은퇴 옵션 (1주기 이상) */}
      {prevCareerCount >= 1 && (
        <div className="flex justify-between items-center mt-lg" style={{
          padding: cameFromMishap ? '0.75rem 1rem' : '0',
          background: cameFromMishap ? 'rgba(200,168,75,0.06)' : 'transparent',
          border: cameFromMishap ? '1px solid var(--col-gold-dim)' : 'none',
          borderRadius: cameFromMishap ? 'var(--radius-md)' : '0',
        }}>
          <span className="text-muted" style={{ fontSize: '0.78rem' }}>
            {cameFromMishap
              ? `이전 ${prevCareerCount - 1}주기 소득이 유지됩니다. 은퇴하면 소득 정산 단계로 이동합니다.`
              : '충분한 경력을 쌓았다면 은퇴하고 퇴직 소득을 정산합니다.'}
          </span>
          <button
            className={cameFromMishap ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={actions.endTermRetire}
          >
            은퇴 — 완성 단계로
          </button>
        </div>
      )}
    </div>
  )
}
