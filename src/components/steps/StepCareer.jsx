// StepCareer.jsx — Step 4: 경력 선택 + 자격 굴림
import { useState } from 'react'
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import { roll1D, statModifier } from '../../utils/dice.js'
import careersData from '../../data/careersData.js'
import { DiceRollInline } from '../DiceAnimator.jsx'

// 징병 표
const DRAFT_TABLE = ['navy', 'army', 'marine', 'merchant', 'scout', 'agent']

export default function StepCareer() {
  const { state, actions } = useCharacterContext()
  const [qualResult, setQualResult] = useState(null)
  const [showDraft, setShowDraft] = useState(false)
  const [draftResult, setDraftResult] = useState(null)

  const { currentCareer, currentSpecialty, careers, hasDrafted, pendingEvent } = state
  const prevCareerCount = careers.length
  const career = careersData[currentCareer]

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
            <button className="btn btn-danger" onClick={handleDraft}>
              🎲 징병 굴림 (1D)
            </button>
          )}
          <button className="btn btn-ghost" onClick={handleDrifter}>
            방랑자로 경력 시작
          </button>
        </div>
        {draftResult && (
          <div className="event-card mt-md">
            <div className="event-roll-label">징병 굴림 결과: {draftResult.roll}</div>
            <div className="event-text">
              {careersData[draftResult.careerId]?.name ?? draftResult.careerId} 경력으로 징병되었습니다.
            </div>
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
          {prevCareerCount > 0
            ? `현재 ${prevCareerCount}번의 주기를 수행했습니다. 새로운 경력에 도전하거나 은퇴할 수 있습니다.`
            : '첫 번째 경력을 선택합니다. 자격 굴림에 성공해야 입대할 수 있습니다.'}
        </p>
      </div>

      {/* 경력 그리드 */}
      <div className="career-grid">
        {Object.entries(careersData).map(([id, c]) => (
          <div
            key={id}
            className={`career-card ${currentCareer === id ? 'selected' : ''}`}
            onClick={() => { actions.selectCareer(id); setQualResult(null) }}
          >
            <div className="career-card-name">{c.name}</div>
            <div className="career-card-req">
              {c.qualification.stat
                ? `자격: ${c.qualification.stat.toUpperCase()} ${c.qualification.target}+`
                : '자격: 자동 성공'}
            </div>
          </div>
        ))}
      </div>

      {/* 직종 선택 */}
      {currentCareer && (
        <div className="card mt-md">
          <div className="card-title">
            {career.name} — 직종 선택
            <span className="card-title-en">SPECIALTY</span>
          </div>
          <div className="choice-group">
            {career.specialties.map(sp => (
              <button
                key={sp.id}
                className={`btn ${currentSpecialty === sp.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => actions.selectSpecialty(sp.id)}
              >
                {sp.name}
                <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--col-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  생존 {sp.survival.stat.toUpperCase()} {sp.survival.target}+
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 자격 굴림 */}
      {currentCareer && currentSpecialty && (
        <div className="card mt-md">
          <div className="card-title">자격 굴림</div>
          {!qualResult ? (
            career.qualification.stat ? (
              <DiceRollInline
                label={`자격 굴림 — ${career.qualification.stat.toUpperCase()} ${career.qualification.target}+${prevCareerCount > 0 ? ` (DM ${-prevCareerCount})` : ''}`}
                count={2}
                mod={statModifier(state.stats[career.qualification.stat === 'dex_or_int'
                  ? (state.stats.dex >= state.stats.int ? 'dex' : 'int')
                  : career.qualification.stat] ?? 0) - prevCareerCount}
                target={career.qualification.target}
                onResult={({ values, total, success }) => {
                  setQualResult({ total, success })
                  actions.resolveQualRoll(success)
                }}
              />
            ) : (
              // 자동 성공 (방랑자)
              <button className="btn btn-primary" onClick={() => { setQualResult({ total: null, success: true }); actions.resolveQualRoll(true) }}>
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
      )}

      {/* 은퇴 옵션 (2주기 이상) */}
      {prevCareerCount >= 2 && (
        <div className="flex justify-between items-center mt-lg">
          <span className="text-muted" style={{ fontSize: '0.78rem' }}>
            충분한 경력을 쌓았다면 은퇴하고 퇴직 소득을 정산합니다.
          </span>
          <button className="btn btn-ghost" onClick={actions.endTermRetire}>
            은퇴 — 완성 단계로
          </button>
        </div>
      )}
    </div>
  )
}
