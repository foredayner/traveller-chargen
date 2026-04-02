// StepBackground.jsx — Step 2: 배경 기능 선택
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import backgroundSkillsData from '../../data/backgroundSkills.js'

export default function StepBackground() {
  const { state, derived, actions } = useCharacterContext()
  const { backgroundSkills } = state
  const slots = derived.backgroundSkillSlots
  const selectedSkills = backgroundSkills.filter(Boolean).map(s => s?.skill).filter(Boolean)

  const toggle = (skill) => {
    const idx = selectedSkills.indexOf(skill)
    if (idx !== -1) {
      // 선택 해제
      actions.setBackgroundSkill(idx, null)
    } else if (backgroundSkills.length < slots) {
      // 새 슬롯에 추가
      actions.setBackgroundSkill(backgroundSkills.length, skill)
    }
  }

  return (
    <div>
      <div className="step-heading">
        <h2>배경 기능 선택</h2>
        <p>
          경력을 시작하기 전, 청소년기에 습득한 기능을 선택합니다.
          교육 수정치 기준으로 총 <strong style={{ color: 'var(--col-gold)' }}>{slots}개</strong>를 선택할 수 있습니다.
          모든 기능은 레벨 0으로 습득됩니다.
        </p>
      </div>

      {/* 선택 현황 */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">
          선택된 기능
          <span className="card-title-en">{backgroundSkills.length} / {slots}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', minHeight: '32px' }}>
          {Array.from({ length: slots }, (_, i) => {
            const skill = backgroundSkills[i]
            return (
              <span
                key={i}
                className={`badge ${skill ? 'badge-gold' : 'badge-muted'}`}
                style={{ cursor: skill ? 'pointer' : 'default' }}
                onClick={() => skill && toggle(skill.skill)}
              >
                {skill ? skill.skill : '—'}
              </span>
            )
          })}
        </div>
      </div>

      {/* 기능 목록 */}
      <div className="card">
        <div className="card-title">
          배경 기능 목록
          <span className="card-title-en">BACKGROUND SKILLS</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {backgroundSkillsData.map(skill => {
            const isSelected = selectedSkills.includes(skill)
            const isFull = backgroundSkills.length >= slots && !isSelected
            return (
              <button
                key={skill}
                className={`badge ${isSelected ? 'badge-gold' : 'badge-muted'}`}
                style={{
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  opacity: isFull && !isSelected ? 0.5 : 1,
                  border: 'none',
                  font: 'inherit',
                }}
                onClick={() => toggle(skill)}
                disabled={isFull}
              >
                {skill}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between items-center mt-lg">
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>
          선택하지 않은 슬롯은 빈 칸으로 남습니다.
        </span>
        <button
          className="btn btn-primary"
          onClick={actions.confirmBackground}
        >
          다음 — 경력 전 교육 →
        </button>
      </div>
    </div>
  )
}
