// StepPreCareer.jsx — Step 3: 경력 전 교육
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import { useState } from 'react'
import { DiceRollInline } from '../DiceAnimator.jsx'

const PRE_CAREER_OPTIONS = [
  {
    id: 'university',
    name: '대학교',
    nameEn: 'University',
    desc: '교육 기능에 집중하지만, 다른 경력의 자격 판정에 보너스를 받습니다.',
    check: { stat: 'int', target: 6, label: '지능 6+' },
    gradCheck: { stat: 'int', target: 8, label: '지능 8+ 졸업 판정' },
    bonus: '졸업 시 교육 +2, 지위 +1. 여러 군 경력 자격 굴림 +1.',
  },
  {
    id: 'army_academy',
    name: '육군사관학교',
    nameEn: 'Army Academy',
    desc: '육군 경력에 특화된 사관학교입니다.',
    check: { stat: 'end', target: 7, label: '인내 7+' },
    gradCheck: { stat: 'end', target: 8, label: '인내 8+ 졸업 판정' },
    bonus: '졸업 시 육군 직무 관련 기능 전체 레벨 0 습득.',
    linkedCareer: 'army',
  },
  {
    id: 'marine_academy',
    name: '해병사관학교',
    nameEn: 'Marine Academy',
    desc: '해병 경력에 특화된 사관학교입니다.',
    check: { stat: 'end', target: 8, label: '인내 8+' },
    gradCheck: { stat: 'end', target: 8, label: '인내 8+ 졸업 판정' },
    bonus: '졸업 시 해병 직무 관련 기능 전체 레벨 0 습득.',
    linkedCareer: 'marine',
  },
  {
    id: 'navy_academy',
    name: '해군사관학교',
    nameEn: 'Naval Academy',
    desc: '해군 경력에 특화된 사관학교입니다.',
    check: { stat: 'int', target: 8, label: '지능 8+' },
    gradCheck: { stat: 'int', target: 8, label: '지능 8+ 졸업 판정' },
    bonus: '졸업 시 해군 직무 관련 기능 전체 레벨 0 습득.',
    linkedCareer: 'navy',
  },
]

export default function StepPreCareer() {
  const { state, actions } = useCharacterContext()
  const [selected, setSelected] = useState(null)
  const [entryResult, setEntryResult] = useState(null)
  const [gradResult, setGradResult]   = useState(null)

  const option = PRE_CAREER_OPTIONS.find(o => o.id === selected)

  const handleConfirm = () => {
    actions.selectPreCareer(selected)
    actions.resolvePreCareer(gradResult?.success ?? false, [])
  }

  return (
    <div>
      <div className="step-heading">
        <h2>경력 전 교육</h2>
        <p>경력을 시작하기 전, 고등 교육을 받을 기회가 있습니다. 원하지 않으면 건너뜁니다.</p>
      </div>

      {/* 교육 선택 카드 */}
      <div className="career-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1.5rem' }}>
        {PRE_CAREER_OPTIONS.map(opt => (
          <div
            key={opt.id}
            className={`career-card ${selected === opt.id ? 'selected' : ''}`}
            onClick={() => { setSelected(opt.id); setEntryResult(null); setGradResult(null) }}
          >
            <div className="career-card-name">{opt.name}</div>
            <div className="career-card-req">{opt.check.label}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--col-text-muted)', marginTop: '0.5rem' }}>
              {opt.desc}
            </p>
          </div>
        ))}
      </div>

      {/* 굴림 처리 */}
      {option && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">{option.name} 입학 절차</div>

          {/* 입학 굴림 */}
          {!entryResult ? (
            <DiceRollInline
              label={`입학 굴림 — ${option.check.label}`}
              count={2}
              mod={(() => {
                const mods = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]
                const v = state.stats[option.check.stat] ?? 0
                return mods[Math.min(15, Math.max(0, v))] ?? 0
              })()}
              target={option.check.target}
              onResult={({ values, total, success }) => {
                const mod = (() => { const mods=[-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]; return mods[Math.min(15,Math.max(0,state.stats[option.check.stat]??0))]??0 })()
                setTimeout(() => setEntryResult({ roll: values[0]+(values[1]??0), mod, total, success }), 600)
              }}
            />
          ) : (
            <div className={`roll-result ${entryResult.success ? 'success' : 'failure'}`}>
              <div className={`roll-total ${entryResult.success ? 'success' : 'failure'}`}>
                {entryResult.total}
              </div>
              <div className="roll-detail">
                2D({entryResult.roll}) + DM({entryResult.mod}) = {entryResult.total}
                <br />
                목표: {option.check.target}+ → {entryResult.success ? '입학 성공!' : '입학 실패'}
              </div>
            </div>
          )}

          {/* 졸업 굴림 */}
          {entryResult?.success && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--col-text-muted)', marginBottom: '0.5rem' }}>
                기능을 습득하고 사건 굴림 후, 졸업 판정을 합니다.
              </p>
              {!gradResult ? (
                <DiceRollInline
                  label={`졸업 굴림 — ${option.gradCheck.label}`}
                  count={2}
                  mod={(() => {
                    const mods = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]
                    const v = state.stats[option.gradCheck.stat] ?? 0
                    return mods[Math.min(15, Math.max(0, v))] ?? 0
                  })()}
                  target={option.gradCheck.target}
                  onResult={({ values, total, success }) => {
                    const mod = (() => { const mods=[-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]; return mods[Math.min(15,Math.max(0,state.stats[option.gradCheck.stat]??0))]??0 })()
                    setTimeout(() => setGradResult({ roll: values[0]+(values[1]??0), mod, total, success }), 600)
                  }}
                />
              ) : (
                <>
                  <div className={`roll-result ${gradResult.success ? 'success' : 'failure'}`}>
                    <div className={`roll-total ${gradResult.success ? 'success' : 'failure'}`}>
                      {gradResult.total}
                    </div>
                    <div className="roll-detail">
                      {gradResult.success ? '졸업 성공!' : '졸업 실패 (기능은 유지)'}<br />
                      {gradResult.success && option.bonus}
                    </div>
                  </div>
                  <button className="btn btn-primary mt-md" onClick={handleConfirm}>
                    다음 — 경력 선택 →
                  </button>
                </>
              )}
            </div>
          )}

          {entryResult && !entryResult.success && (
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => actions.skipPreCareer()}>
                다음 — 경력 선택 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 건너뛰기 */}
      <div className="flex justify-between items-center">
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>
          경력 전 교육은 선택 사항입니다. 한 번만 선택할 수 있습니다.
        </span>
        <button className="btn btn-ghost" onClick={actions.skipPreCareer}>
          건너뛰기 — 바로 경력 선택
        </button>
      </div>
    </div>
  )
}
