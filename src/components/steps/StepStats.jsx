// ─────────────────────────────────────────────────────────────
//  StepStats.jsx — Step 1: 특성치 결정
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import { statModifier } from '../../utils/dice.js'
import { DiceFace } from '../DiceAnimator.jsx'

const STAT_KEYS = ['str', 'dex', 'end', 'int', 'edu', 'soc']
const STAT_NAMES = {
  str: '근력', dex: '민첩', end: '인내',
  int: '지능', edu: '교육', soc: '지위',
}
const STAT_NAMES_EN = {
  str: 'STR', dex: 'DEX', end: 'END',
  int: 'INT', edu: 'EDU', soc: 'SOC',
}

export default function StepStats() {
  const { state, actions } = useCharacterContext()
  const { statRolls, statAssignments } = state
  const [dragFrom, setDragFrom] = useState(null)  // 드래그 중인 특성치 key
  const [animating, setAnimating] = useState(false)

  const hasRolled = statRolls.length === 6

  // 배분된 값 → 표시할 수치
  const getStatValue = (statKey) => {
    if (!hasRolled) return 0
    const roll = statRolls[statAssignments[statKey]]
    return (typeof roll === 'object' ? roll?.total : roll) ?? 0
  }

  // 전체 굴림
  const handleRollAll = () => {
    if (animating) return
    setAnimating(true)
    actions.rollAllStats()
    setTimeout(() => setAnimating(false), 600)
  }

  // 단일 재굴림
  const handleRerollOne = (rollIndex) => {
    if (animating) return
    actions.rerollOneStat(rollIndex)
  }

  // 드래그 앤 드롭 배분
  const handleDragStart = (statKey) => setDragFrom(statKey)
  const handleDrop = (targetStat) => {
    if (!dragFrom || dragFrom === targetStat) return
    const fromIdx = statAssignments[dragFrom]
    const toIdx   = statAssignments[targetStat]
    // swap
    actions.assignStat(dragFrom, toIdx)
    actions.assignStat(targetStat, fromIdx)
    setDragFrom(null)
  }

  const canConfirm = hasRolled && STAT_KEYS.every(k => statAssignments[k] !== undefined)

  return (
    <div>
      <div className="step-heading">
        <h2>특성치 결정</h2>
        <p>2D를 6번 굴려 결과를 6개의 특성치에 원하는 순서대로 배분합니다. 드래그로 바꿀 수 있습니다.</p>
      </div>

      {/* ── 굴림 버튼 ── */}
      <div className="flex gap-sm mt-md" style={{ marginBottom: '1.5rem', alignItems:'center' }}>
        <button
          className="btn btn-primary"
          style={{
            display:'inline-flex', alignItems:'center', gap:'0.5rem',
            animation: animating ? 'pulse 0.4s ease infinite alternate' : 'none',
          }}
          onClick={handleRollAll}
          disabled={animating}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" style={{flexShrink:0}}>
            <rect x="1" y="1" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor"/>
            <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor"/>
            <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
            <circle cx="6.5" cy="13.5" r="1.5" fill="currentColor"/>
            <circle cx="13.5" cy="13.5" r="1.5" fill="currentColor"/>
          </svg>
          {animating ? '굴리는 중…' : hasRolled ? '전체 다시 굴리기' : '특성치 굴리기 (2D ×6)'}
        </button>
        {hasRolled && (
          <span className="text-muted" style={{ fontSize: '0.78rem' }}>
            드래그해서 배분 순서를 바꿀 수 있습니다
          </span>
        )}
      </div>

      {/* ── 주사위 결과 표시 ── */}
      {hasRolled && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">
            굴림 결과
            <span className="card-title-en">RAW ROLLS</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {statRolls.map((rollData, i) => {
              const usedByStat = Object.entries(statAssignments).find(([, idx]) => idx === i)?.[0]
              const total = typeof rollData === 'object' ? rollData.total : rollData
              const d1    = typeof rollData === 'object' ? rollData.d1 : null
              const d2    = typeof rollData === 'object' ? rollData.d2 : null
              const diceColor = usedByStat ? 'var(--col-gold)' : 'var(--col-cyan)'
              return (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', minWidth:'64px' }}>
                  {/* 주사위 2개 나란히 */}
                  <div style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                    {d1 !== null
                      ? <>
                          <DiceFace value={d1} size={36} color={diceColor} glowing={!!usedByStat} rolling={animating} />
                          <DiceFace value={d2} size={36} color={diceColor} glowing={!!usedByStat} rolling={animating} />
                        </>
                      : <DiceFace value={total} size={44} color={diceColor} glowing={!!usedByStat} rolling={animating} />
                    }
                  </div>
                  {/* 합계 */}
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'1rem', fontWeight:500, color:usedByStat?'var(--col-gold)':'var(--col-cyan)' }}>
                    {total}
                  </div>
                  {/* 배분된 특성치 표시 */}
                  <span style={{ fontSize:'0.6rem', color:'var(--col-text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.05em' }}>
                    {usedByStat ? STAT_NAMES_EN[usedByStat] : '—'}
                  </span>
                  {/* 단일 재굴림 */}
                  <button className="btn btn-ghost" style={{ fontSize:'0.6rem', padding:'2px 6px' }}
                    onClick={() => actions.rerollOneStat(i)} title="이 주사위만 다시 굴리기">
                    ↺
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 특성치 배분 그리드 ── */}
      <div className="stat-grid">
        {STAT_KEYS.map((statKey) => {
          const value = getStatValue(statKey)
          const mod   = statModifier(value)
          const modStr = mod > 0 ? `+${mod}` : `${mod}`
          const modClass = mod > 0 ? 'pos' : mod < 0 ? 'neg' : ''

          return (
            <div
              key={statKey}
              className={`stat-card ${dragFrom === statKey ? 'stat-highlight' : ''}`}
              draggable={hasRolled}
              onDragStart={() => handleDragStart(statKey)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(statKey)}
              title={hasRolled ? '드래그해서 교환' : ''}
            >
              <div className="stat-name">{STAT_NAMES_EN[statKey]}</div>
              <div className="stat-value">
                {hasRolled ? value : '—'}
              </div>
              <div className="stat-name" style={{ marginTop: '2px', marginBottom: '2px' }}>
                {STAT_NAMES[statKey]}
              </div>
              {hasRolled && (
                <div className={`stat-mod ${modClass}`}>
                  DM {modStr}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 수정치 설명 ── */}
      {hasRolled && (
        <div className="card mt-md" style={{ fontSize: '0.78rem', color: 'var(--col-text-muted)' }}>
          <div className="card-title" style={{ fontSize: '0.8rem' }}>
            특성치 수정치 (DM) 표
            <span className="card-title-en">MODIFIER TABLE</span>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
            {[
              ['0', '-3'], ['1-2', '-2'], ['3-5', '-1'],
              ['6-8', '0'], ['9-11', '+1'], ['12-14', '+2'], ['15+', '+3'],
            ].map(([range, mod]) => (
              <span key={range}>
                <span style={{ color: 'var(--col-text-dim)' }}>{range}</span>
                {' → '}
                <span style={{ color: mod.startsWith('+') ? 'var(--col-green)' : mod === '0' ? 'var(--col-text)' : 'var(--col-red)' }}>
                  {mod}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 확인 버튼 ── */}
      <div className="flex justify-between items-center mt-lg">
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>
          {hasRolled ? '배분이 완료되면 다음 단계로 진행합니다.' : '먼저 주사위를 굴려 주세요.'}
        </span>
        <button
          className="btn btn-primary"
          onClick={actions.confirmStats}
          disabled={!canConfirm}
        >
          다음 — 배경 기능 →
        </button>
      </div>
    </div>
  )
}
