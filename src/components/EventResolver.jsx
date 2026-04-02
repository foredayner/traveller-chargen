// ─────────────────────────────────────────────────────────────
//  EventResolver.jsx
//
//  트래블러 사건/사고 표의 모든 effect 타입을 처리하는 엔진.
//  events.json의 구조를 그대로 소비하며, 플레이어 입력이 필요한
//  경우(choice, check, skill_choice 등) UI를 렌더링하고,
//  자동 처리 가능한 효과는 즉시 리듀서에 반영합니다.
//
//  사용법:
//    <EventResolver
//      eventData={eventObj}        // events.json의 단일 사건/사고 항목
//      isMishap={false}            // 사고 표 여부 (UI 색상 변경)
//      onResolved={fn}             // 모든 효과 처리 완료 시 호출
//    />
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useCharacterContext } from '../store/CharacterContext.jsx'
import { checkStat, checkSkill, roll1D, roll2D, rollInjuryTable } from '../utils/dice.js'
import { lifeEvents, injuryTable, getAgingResult } from '../data/eventsData.js'
import { DiceRollInline, DiceFace } from './DiceAnimator.jsx'

// ─── 특성치 한국어 → 코드 키 ──────────────────────────────────
const STAT_KEY = {
  str:'str', dex:'dex', end:'end', int:'int', edu:'edu', soc:'soc',
  '근력':'str','민첩':'dex','인내':'end','지능':'int','교육':'edu','지위':'soc',
}
const STAT_NAME_KO = { str:'근력', dex:'민첩', end:'인내', int:'지능', edu:'교육', soc:'지위' }
const PHYSICAL_STATS = ['str', 'dex', 'end']
const CONTACT_LABELS = { ally:'조력자', contact:'연줄', rival:'경쟁자', enemy:'적수' }

// ─────────────────────────────────────────────────────────────
//  메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function EventResolver({ eventData, isMishap = false, onResolved }) {
  const { state, actions } = useCharacterContext()
  // pendingEffects: 아직 처리되지 않은 effects 큐
  const [queue, setQueue]       = useState(() => [...(eventData?.effects ?? [])])
  const [resolved, setResolved] = useState([])   // 처리 완료된 효과 로그
  const [done, setDone]         = useState(false)

  // 현재 처리할 effect
  const current = queue[0] ?? null

  // ── 효과 처리 완료 → 큐에서 제거 + 로그 추가 ──────────────
  const advance = useCallback((logEntry = null, extraQueue = []) => {
    setQueue(q => {
      const next = [...extraQueue, ...q.slice(1)]
      return next
    })
    if (logEntry) setResolved(r => [...r, logEntry])
  }, [])

  // 큐가 비었을 때
  const handleAllDone = useCallback(() => {
    setDone(true)
    onResolved?.(resolved)
  }, [onResolved, resolved])

  // 빈 큐 감지
  if (!done && queue.length === 0) {
    handleAllDone()
  }

  // ─── 렌더: 완료 상태 ────────────────────────────────────────
  if (done) {
    return (
      <ResolvedSummary
        eventData={eventData}
        isMishap={isMishap}
        log={resolved}
      />
    )
  }

  // ─── 렌더: 현재 effect 처리 UI ──────────────────────────────
  return (
    <div className="event-resolver">
      {/* 사건 원문 텍스트 */}
      <EventHeader eventData={eventData} isMishap={isMishap} />

      {/* 처리된 효과 로그 */}
      {resolved.length > 0 && (
        <div className="resolver-log">
          {resolved.map((log, i) => (
            <LogEntry key={i} log={log} />
          ))}
        </div>
      )}

      {/* 현재 처리 중인 effect */}
      {current && (
        <EffectHandler
          effect={current}
          state={state}
          actions={actions}
          isMishap={isMishap}
          onDone={(logEntry, extraEffects = []) => advance(logEntry, extraEffects)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  사건 헤더
// ─────────────────────────────────────────────────────────────
function EventHeader({ eventData, isMishap }) {
  if (!eventData) return null
  return (
    <div className={`event-card ${isMishap ? 'mishap' : ''}`} style={{ marginBottom: '1rem' }}>
      {isMishap && (
        <div className="event-roll-label" style={{ color: 'var(--col-red)' }}>⚠ 사고 발생</div>
      )}
      <div className="event-text">{eventData.text}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  처리 완료 요약
// ─────────────────────────────────────────────────────────────
function ResolvedSummary({ eventData, isMishap, log }) {
  return (
    <div>
      <div className={`event-card ${isMishap ? 'mishap' : ''}`}>
        <div className="event-roll-label">
          {isMishap ? '⚠ 사고 처리 완료' : '✓ 사건 처리 완료'}
        </div>
        <div className="event-text">{eventData?.text}</div>
      </div>
      {log.length > 0 && (
        <div className="resolver-log" style={{ marginTop: '0.75rem' }}>
          {log.map((l, i) => <LogEntry key={i} log={l} />)}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  로그 항목 렌더
// ─────────────────────────────────────────────────────────────
function LogEntry({ log }) {
  const colorMap = {
    success: 'var(--col-green)', failure: 'var(--col-red)',
    gain: 'var(--col-cyan)', loss: 'var(--col-red)',
    neutral: 'var(--col-text-muted)', contact: 'var(--col-gold)',
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '0.4rem',
      padding: '0.2rem 0', borderBottom: '1px solid rgba(30,45,74,0.4)',
      fontSize: '0.8rem',
    }}>
      <span style={{ color: colorMap[log.kind] ?? 'var(--col-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', minWidth: '52px' }}>
        {log.tag}
      </span>
      <span style={{ color: colorMap[log.kind] ?? 'var(--col-text)' }}>{log.text}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  핵심: 개별 effect 처리기 라우터
// ─────────────────────────────────────────────────────────────
function EffectHandler({ effect, state, actions, isMishap, onDone }) {
  switch (effect.type) {

    // ── 즉시 처리 (UI 불필요) ──────────────────────────────────
    case 'ally':
    case 'contact':
    case 'rival':
    case 'enemy':
      return (
        <AutoContactEffect
          effect={effect}
          actions={actions}
          onDone={onDone}
        />
      )

    case 'contacts': // D3명 또는 1D명
      return <AutoMultiContactEffect effect={effect} type="contact" actions={actions} onDone={onDone} />
    case 'enemies':
      return <AutoMultiContactEffect effect={effect} type="enemy" actions={actions} onDone={onDone} />

    case 'stat':
      return <AutoStatEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'skill':
      return <AutoSkillEffect effect={effect} actions={actions} onDone={onDone} />

    case 'advancement_dm':
      return <AutoFlagEffect effect={effect} label="진급 DM" tag="진급" actions={actions} onDone={onDone}
        apply={() => actions.dispatch?.({ type: 'SET_ADVANCEMENT_DM', value: effect.value })} />

    case 'next_qualification_dm':
    case 'muster_dm':
    case 'extra_muster_roll':
    case 'lose_muster_roll':
    case 'keep_muster':
    case 'keep_last_two_muster':
    case 'lose_all_muster':
    case 'next_term_prisoner':
    case 'next_term_draft':
    case 'end_career':
    case 'end_career_no_muster':
    case 'honorable_discharge':
    case 'dishonorable_discharge':
    case 'maybe_prisoner':
    case 'enemy_if_none':
    case 'contact_to_rival_or_new_enemy':
    case 'alien_contact':
    case 'high_contact':
    case 'alien_artifact':
    case 'ancient_tech':
    case 'psion_test':
    case 'auto_advance':
    case 'auto_advance_or_commission':
      return <AutoNarrativeEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    // ── 플레이어 선택 필요 ─────────────────────────────────────
    case 'choice':
    case 'choice_or_contact':
      return <ChoiceEffect effect={effect} state={state} actions={actions} isMishap={isMishap} onDone={onDone} />

    case 'skill_choice':
      return <SkillChoiceEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'any_skill_up':
      return <AnySkillUpEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'stat_choice':
      return <StatChoiceEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    // ── 주사위 굴림 필요 ───────────────────────────────────────
    case 'check':
    case 'check_or_injury':
      return <CheckEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'specialty_check':
      return <SpecialtyCheckEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'injury':
      return <InjuryEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'life_event':
      return <LifeEventEffect state={state} actions={actions} onDone={onDone} />

    case 'weird_event':
      return <WeirdEventEffect state={state} actions={actions} onDone={onDone} />

    case 'mishap_no_end':
      return <MishapNoEndEffect state={state} actions={actions} onDone={onDone} />

    case 'optional_gamble':
      return <OptionalGambleEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'optional_adventure':
      return <OptionalAdventureEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'skill_choice_then_check':
      return <SkillChoiceThenCheckEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'optional_exploit':
      return <OptionalExploitEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'optional_rogue_no_qual':
      return <SimpleNarrativeEffect
        text="제국의 무역 규제로 상거래를 중단합니다. 원한다면 다음 주기에 자격 굴림 없이 무법자 경력을 선택할 수 있습니다."
        onDone={() => onDone({ tag: '선택권', text: '무법자 경력 특례 부여', kind: 'neutral' })}
      />

    case 'injury_to_contact':
      return <InjuryToContactEffect state={state} actions={actions} onDone={onDone} />

    case 'scholar_skill_specialty':
      return <ScholarSpecialtyEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'skill_or_contact':
      return <SkillOrContactEffect effect={effect} state={state} actions={actions} onDone={onDone} />

    case 'skill_table_roll':
      return <SimpleNarrativeEffect
        text="기능과 훈련 표에서 주사위를 굴립니다. GM과 상의하세요."
        onDone={() => onDone({ tag: '기능', text: '기능 표 굴림 (별도 처리)', kind: 'neutral' })}
      />

    case 'cross_career_event':
      return <SimpleNarrativeEffect
        text={`타 경력(${(effect.careers||[]).join(', ')}) 사건 표에서 추가 굴림합니다. GM과 상의하세요.`}
        onDone={() => onDone({ tag: '사건', text: '타 경력 사건 표', kind: 'neutral' })}
      />

    case 'cross_career_mishap':
      return <SimpleNarrativeEffect
        text={`타 경력(${(effect.careers||[]).join(', ')}) 사고 표에서 추가 굴림합니다. GM과 상의하세요.`}
        onDone={() => onDone({ tag: '사고', text: '타 경력 사고 표', kind: 'neutral' })}
      />

    default:
      // 알 수 없는 타입 — 그냥 넘어감
      return (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>
            처리 타입: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--col-cyan)' }}>{effect.type}</code>
          </p>
          <button className="btn btn-ghost" style={{ marginTop: '0.5rem' }}
            onClick={() => onDone({ tag: '알림', text: `${effect.type} — 별도 처리`, kind: 'neutral' })}>
            확인
          </button>
        </div>
      )
  }
}

// ═════════════════════════════════════════════════════════════
//  개별 Effect 핸들러 컴포넌트들
// ═════════════════════════════════════════════════════════════

// ── 자동: 연줄 추가 ───────────────────────────────────────────
function AutoContactEffect({ effect, actions, onDone }) {
  const type = effect.type  // 'ally' | 'contact' | 'rival' | 'enemy'
  const desc = effect.description ?? ''
  const colorMap = { ally:'var(--col-green)', contact:'var(--col-cyan)', rival:'var(--col-amber)', enemy:'var(--col-red)' }
  const kindMap  = { ally:'gain', contact:'contact', rival:'loss', enemy:'loss' }

  const apply = () => {
    actions.addContact(type, desc)
    onDone({ tag: CONTACT_LABELS[type], text: desc || `${CONTACT_LABELS[type]} 1명 추가`, kind: kindMap[type] })
  }

  return (
    <ConfirmCard
      label={`${CONTACT_LABELS[type]} 획득`}
      color={colorMap[type]}
      detail={desc || `새 ${CONTACT_LABELS[type]}을(를) 얻습니다.`}
      onConfirm={apply}
    />
  )
}

// ── 자동: 다수 연줄 추가 ─────────────────────────────────────
function AutoMultiContactEffect({ effect, type, actions, onDone }) {
  const count = effect.count
  const label = CONTACT_LABELS[type] ?? type

  const apply = () => {
    let n = 0
    if (count === 'D3') n = Math.ceil(roll1D() / 2)
    else if (count === '1D') n = roll1D()
    else n = parseInt(count) || 1

    for (let i = 0; i < n; i++) actions.addContact(type, '')
    onDone({ tag: label, text: `${label} ${n}명 추가`, kind: type === 'enemy' ? 'loss' : 'contact' })
  }

  return (
    <ConfirmCard
      label={`${label} 획득`}
      color={type === 'enemy' ? 'var(--col-red)' : 'var(--col-cyan)'}
      detail={`${count}명의 ${label}을(를) 얻습니다. 버튼을 누르면 주사위가 굴러집니다.`}
      onConfirm={apply}
    />
  )
}

// ── 자동: 특성치 변경 ─────────────────────────────────────────
function AutoStatEffect({ effect, state, actions, onDone }) {
  const statKey = STAT_KEY[effect.stat] ?? effect.stat
  const delta   = effect.value ?? 0
  const current = state.stats[statKey] ?? 0
  const next    = Math.max(0, Math.min(15, current + delta))
  const label   = STAT_NAME_KO[statKey] ?? statKey

  const apply = () => {
    actions.applyStatChange(statKey, delta)
    onDone({
      tag: label,
      text: `${label} ${delta > 0 ? '+' : ''}${delta} (${current} → ${next})`,
      kind: delta > 0 ? 'gain' : 'loss',
    })
  }

  return (
    <ConfirmCard
      label={`${label} ${delta > 0 ? '+' : ''}${delta}`}
      color={delta > 0 ? 'var(--col-green)' : 'var(--col-red)'}
      detail={`${label} ${current} → ${next}`}
      onConfirm={apply}
    />
  )
}

// ── 자동: 기능 직접 획득 ─────────────────────────────────────
function AutoSkillEffect({ effect, actions, onDone }) {
  const { skill, level = 1 } = effect
  const apply = () => {
    actions.applySkill(skill, level)
    onDone({ tag: '기능', text: `${skill} → 레벨 ${level}`, kind: 'gain' })
  }
  return (
    <ConfirmCard
      label={`${skill} ${level}레벨 획득`}
      color="var(--col-cyan)"
      detail={`${skill} 기능을 레벨 ${level}로 향상시킵니다.`}
      onConfirm={apply}
    />
  )
}

// ── 자동: 플래그/서사 효과 (즉시 처리) ───────────────────────
function AutoFlagEffect({ effect, label, tag, actions, apply, onDone }) {
  const handleApply = () => {
    apply?.()
    onDone({ tag, text: `${label} 적용`, kind: 'neutral' })
  }
  return (
    <ConfirmCard
      label={label}
      color="var(--col-text-muted)"
      detail=""
      onConfirm={handleApply}
    />
  )
}

// ── 자동: 서사적 효과 (텍스트만) ────────────────────────────
function AutoNarrativeEffect({ effect, state, actions, onDone }) {
  const narratives = {
    next_term_prisoner:       { tag:'경력', text:'다음 주기 죄수 경력으로 시작합니다.', kind:'loss' },
    next_term_draft:          { tag:'징병', text:'다음 주기 징병 굴림을 합니다.', kind:'neutral' },
    end_career:               { tag:'경력', text:'경력이 강제 종료됩니다.', kind:'loss' },
    end_career_no_muster:     { tag:'경력', text:'소득 없이 경력이 종료됩니다.', kind:'loss' },
    honorable_discharge:      { tag:'제대', text:'명예 제대. 이번 주기 소득을 유지합니다.', kind:'neutral' },
    dishonorable_discharge:   { tag:'제대', text:'불명예 제대. 경력이 종료됩니다.', kind:'loss' },
    auto_advance:             { tag:'진급', text:'자동으로 진급합니다!', kind:'success' },
    auto_advance_or_commission:{ tag:'진급', text:'자동으로 진급하거나 임관됩니다!', kind:'success' },
    maybe_prisoner:           { tag:'위험', text:'2D 굴림 — 2가 나오면 다음 주기 죄수 경력입니다.', kind:'neutral' },
    enemy_if_none:            { tag:'적수', text:'아직 적수가 없다면 적수를 얻습니다.', kind:'loss' },
    contact_to_rival_or_new_enemy: { tag:'배신', text:'연줄/조력자 중 한 명이 경쟁자나 적수로 바뀝니다.', kind:'loss' },
    alien_contact:            { tag:'연줄', text:'외계 종족 연줄 1명을 얻습니다.', kind:'contact' },
    high_contact:             { tag:'연줄', text:'제국 상층부와 접촉합니다.', kind:'contact' },
    alien_artifact:           { tag:'획득', text:'외계 유물을 얻습니다.', kind:'gain' },
    ancient_tech:             { tag:'획득', text:'고대 기술을 얻습니다.', kind:'gain' },
    psion_test:               { tag:'초능력', text:'초능력 검사를 받을 수 있습니다. GM과 상의하세요.', kind:'neutral' },
    advancement_dm:           { tag:'진급DM', text:`다음 진급 굴림에 +${effect.value}`, kind:'gain' },
    next_qualification_dm:    { tag:'자격DM', text:`다음 자격 굴림에 +${effect.value}`, kind:'gain' },
    muster_dm:                { tag:'소득DM', text:`소득 굴림 +${effect.value} (${effect.uses ?? 1}회)`, kind:'gain' },
    extra_muster_roll:        { tag:'소득', text:'소득 굴림 기회 1회 추가', kind:'gain' },
    lose_muster_roll:         { tag:'소득', text:`소득 굴림 ${effect.count ?? 1}회 손실`, kind:'loss' },
    keep_muster:              { tag:'소득', text:'이번 주기 소득을 유지합니다.', kind:'neutral' },
    keep_last_two_muster:     { tag:'소득', text:'최근 두 주기의 소득을 유지합니다.', kind:'neutral' },
    lose_all_muster:          { tag:'소득', text:'이 경력의 소득 전체를 잃습니다.', kind:'loss' },
  }

  const entry = narratives[effect.type] ?? { tag:'알림', text: effect.type, kind:'neutral' }

  // 자동으로 바로 적용 (연줄/플래그 실제 적용 포함)
  const apply = () => {
    if (effect.type === 'enemy_if_none' && state.contacts.every(c => c.type !== 'enemy')) {
      actions.addContact('enemy', '')
    }
    if (effect.type === 'alien_contact') {
      actions.addContact('contact', '외계 종족')
    }
    onDone(entry)
  }

  return (
    <ConfirmCard
      label={entry.text}
      color={entry.kind === 'gain' || entry.kind === 'success' ? 'var(--col-green)'
           : entry.kind === 'loss' ? 'var(--col-red)'
           : entry.kind === 'contact' ? 'var(--col-cyan)'
           : 'var(--col-text-muted)'}
      detail=""
      onConfirm={apply}
    />
  )
}

// ── 선택: choice / choice_or_contact ─────────────────────────
function ChoiceEffect({ effect, state, actions, isMishap, onDone }) {
  const [chosen, setChosen] = useState(null)

  const options = effect.type === 'choice_or_contact'
    ? [
        ...( effect.skills ? effect.skills.map(s => ({ label: `${s} +1`, effects: [{ type:'skill', skill:s, level:1 }] })) : [] ),
        { label: '연줄 1명', effects: [{ type:'contact' }] },
      ]
    : (effect.options ?? [])

  if (chosen !== null) {
    const extra = options[chosen].effects ?? []
    // extra가 없으면 즉시 완료
    if (extra.length === 0) {
      return (
        <div>
          <div style={{ padding:'0.5rem 0', fontSize:'0.8rem', color:'var(--col-gold)', fontFamily:'var(--font-mono)' }}>
            ✓ 선택: {options[chosen].label}
          </div>
          <button className="btn btn-ghost" onClick={() =>
            onDone({ tag:'선택', text: options[chosen].label, kind:'neutral' })
          }>확인</button>
        </div>
      )
    }
    // sub-effects가 있으면 순차 큐로 처리
    return (
      <ChoiceSubQueue
        label={options[chosen].label}
        effects={extra}
        state={state}
        actions={actions}
        isMishap={isMishap}
        onDone={onDone}
      />
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>선택하세요</div>
      <div className="choice-group">
        {options.map((opt, i) => (
          <button
            key={i}
            className="btn btn-primary"
            onClick={() => setChosen(i)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 선택: skill_choice (기능 목록 중 하나 선택) ──────────────
function SkillChoiceEffect({ effect, state, actions, onDone }) {
  const { skills, level = 1 } = effect
  const [picked, setPicked] = useState(null)

  if (picked) {
    return (
      <ConfirmCard
        label={`${picked} 레벨 ${level} 확정`}
        color="var(--col-cyan)"
        detail={`${picked} 기능을 레벨 ${level}로 획득합니다.`}
        onConfirm={() => {
          actions.applySkill(picked, level)
          onDone({ tag:'기능', text:`${picked} → 레벨 ${level}`, kind:'gain' })
        }}
      />
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>
        기능 선택 — 레벨 {level}
      </div>
      <div className="choice-group">
        {skills.map(s => (
          <button key={s} className="btn btn-primary" onClick={() => setPicked(s)}>
            {s}
            {state.skills[s] !== undefined && (
              <span style={{ marginLeft:'0.3rem', fontSize:'0.65rem', color:'var(--col-text-muted)', fontFamily:'var(--font-mono)' }}>
                (현재 {state.skills[s]})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 선택: any_skill_up (보유 기능 중 하나 향상) ───────────────
function AnySkillUpEffect({ effect, state, actions, onDone }) {
  const { level = 1 } = effect
  const skillList = Object.entries(state.skills)
  const [picked, setPicked] = useState(null)

  if (skillList.length === 0) {
    return (
      <SimpleNarrativeEffect
        text="보유 기능이 없어 향상할 수 없습니다."
        onDone={() => onDone({ tag:'기능', text:'향상할 기능 없음', kind:'neutral' })}
      />
    )
  }

  if (picked) {
    return (
      <ConfirmCard
        label={`${picked} → 레벨 ${(state.skills[picked] ?? 0) + level}`}
        color="var(--col-cyan)"
        detail=""
        onConfirm={() => {
          actions.applySkillDelta(picked, level)
          onDone({ tag:'기능', text:`${picked} +${level}레벨`, kind:'gain' })
        }}
      />
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>
        보유 기능 중 하나를 {level}레벨 향상
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
        {skillList.map(([skill, lv]) => (
          <button key={skill} className="btn btn-primary" style={{ fontSize:'0.78rem' }}
            onClick={() => setPicked(skill)}
          >
            {skill} <span style={{ fontFamily:'var(--font-mono)', marginLeft:'0.25rem' }}>{lv}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 선택: stat_choice (특성치 선택 감소) ─────────────────────
function StatChoiceEffect({ effect, state, actions, onDone }) {
  const { stats: statList, value } = effect
  const [picked, setPicked] = useState(null)

  if (picked) {
    return (
      <ConfirmCard
        label={`${STAT_NAME_KO[picked] ?? picked} ${value > 0 ? '+' : ''}${-value}`}
        color="var(--col-red)"
        detail=""
        onConfirm={() => {
          actions.applyStatChange(picked, -value)
          onDone({ tag: STAT_NAME_KO[picked], text: `${STAT_NAME_KO[picked]} -${value}`, kind:'loss' })
        }}
      />
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>
        특성치 선택 — {value}만큼 감소
      </div>
      <div className="choice-group">
        {(statList ?? PHYSICAL_STATS).map(s => {
          const key = STAT_KEY[s] ?? s
          return (
            <button key={key} className="btn btn-danger"
              onClick={() => setPicked(key)}
            >
              {STAT_NAME_KO[key] ?? key} ({state.stats[key] ?? 0} → {(state.stats[key] ?? 0) - value})
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 판정: check / check_or_injury ────────────────────────────
function CheckEffect({ effect, state, actions, onDone }) {
  const [result, setResult] = useState(null)
  const [subEffectDone, setSubEffectDone] = useState(false)

  // 판정할 특성치 또는 기능 결정
  const getCheckLabel = () => {
    if (effect.skill)     return `${effect.skill} ${effect.target}+`
    if (effect.stat)      return `${STAT_NAME_KO[STAT_KEY[effect.stat]] ?? effect.stat} ${effect.target}+`
    if (effect.skill_or)  return `${effect.skill_or.join(' 또는 ')} ${effect.target}+`
    if (effect.skill_or_stat) return `${effect.skill_or_stat.join(' 또는 ')} ${effect.target}+`
    return `판정 ${effect.target}+`
  }

  const doRoll = () => {
    let r
    if (effect.skill && state.skills[effect.skill] !== undefined) {
      r = checkSkill(state.skills[effect.skill], effect.target)
    } else if (effect.skill_or) {
      // 가장 높은 레벨의 기능 사용
      const best = effect.skill_or.reduce((best, s) =>
        (state.skills[s] ?? -1) > (state.skills[best] ?? -1) ? s : best,
        effect.skill_or[0]
      )
      r = checkSkill(state.skills[best] ?? 0, effect.target)
    } else {
      const statKey = STAT_KEY[effect.stat ?? 'int'] ?? 'int'
      r = checkStat(state.stats[statKey] ?? 0, effect.target)
    }
    setResult(r)
  }

  const afterEffects = result?.success
    ? (effect.success ?? [])
    : (effect.failure ?? [])

  // 결과가 있고 후속 효과가 없으면 즉시 완료
  if (result && afterEffects.length === 0 && !subEffectDone) {
    return (
      <div>
        <RollResultDisplay result={result} label={getCheckLabel()} />
        <button className="btn btn-primary" style={{ marginTop:'0.75rem' }}
          onClick={() => onDone({ tag:'판정', text:`${getCheckLabel()} — ${result.success ? '성공' : '실패'}`, kind: result.success ? 'success' : 'failure' })}
        >
          확인
        </button>
      </div>
    )
  }

  if (result && !subEffectDone) {
    return (
      <div>
        <RollResultDisplay result={result} label={getCheckLabel()} />
        <div style={{ marginTop:'0.75rem' }}>
          {afterEffects.map((e, i) => (
            <EffectHandler
              key={i}
              effect={e}
              state={state}
              actions={actions}
              isMishap={false}
              onDone={(log) => {
                if (i === afterEffects.length - 1) {
                  setSubEffectDone(true)
                  onDone({ tag:'판정', text:`${result.success ? '성공' : '실패'}`, kind: result.success ? 'success' : 'failure' })
                }
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // 판정 DM 계산 (기능 레벨 or 특성치 수정치)
  const getDm = () => {
    const MOD = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]
    const sm  = v => MOD[Math.min(15,Math.max(0,v??0))]??0
    if (effect.skill && state.skills[effect.skill] !== undefined)
      return Math.max(0, state.skills[effect.skill])
    if (effect.skill_or)
      return Math.max(0, Math.max(...effect.skill_or.map(s => state.skills[s] ?? -1)))
    const STAT_K = { str:'str',dex:'dex',end:'end',int:'int',edu:'edu',soc:'soc' }
    const k = STAT_K[effect.stat] ?? effect.stat ?? 'int'
    if (k && state.stats[k] !== undefined) return sm(state.stats[k])
    return 0
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>판정 — {getCheckLabel()}</div>
      <DiceRollInline
        label={getCheckLabel()}
        count={2}
        mod={getDm()}
        target={effect.target}
        onResult={({ values, total, success }) => {
          setResult({ roll: values[0]+(values[1]??0), mod: getDm(), total, success })
        }}
      />
    </div>
  )
}

// ── 판정: specialty_check (직종별 자동 기능 판정) ────────────
function SpecialtyCheckEffect({ effect, state, actions, onDone }) {
  const [result, setResult] = useState(null)

  const doRoll = () => {
    // 직종에 따라 자동으로 기능 선택
    const r = checkStat(state.stats.int ?? 7, effect.target)
    setResult(r)
  }

  const afterEffects = result?.success ? (effect.success ?? []) : (effect.failure ?? [])

  if (result && afterEffects.length === 0) {
    return (
      <div>
        <RollResultDisplay result={result} label={`직종 판정 ${effect.target}+`} />
        <button className="btn btn-primary" style={{ marginTop:'0.75rem' }}
          onClick={() => onDone({ tag:'직종판정', text: result.success ? '성공' : '실패', kind: result.success ? 'success':'failure' })}
        >확인</button>
      </div>
    )
  }

  if (result) {
    return (
      <div>
        <RollResultDisplay result={result} label={`직종 판정 ${effect.target}+`} />
        {afterEffects.map((e, i) => (
          <EffectHandler key={i} effect={e} state={state} actions={actions} isMishap={false}
            onDone={(log) => {
              if (i === afterEffects.length - 1)
                onDone({ tag:'직종판정', text: result.success ? '성공':'실패', kind: result.success?'success':'failure' })
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>직종 판정 — {effect.target}+</div>
      <button className="btn btn-primary" onClick={doRoll}>🎲 굴리기</button>
    </div>
  )
}

// ── 굴림: 부상 표 ────────────────────────────────────────────
function InjuryEffect({ effect, state, actions, onDone }) {
  const [rollResult, setRollResult] = useState(null)
  const [subDone, setSubDone] = useState(false)

  const isSevere = effect.severity === 'severe'
  const isHigh   = effect.severity === 'severe_high'  // 높은 값 선택

  const doRoll = () => {
    const res = isSevere
      ? rollInjuryTable(true)   // 두 번 굴려 낮은 값
      : isHigh
        ? { roll: Math.max(roll1D(), roll1D()), rolls: [] }
        : rollInjuryTable(false)
    setRollResult(res)
  }

  if (rollResult) {
    const entry = injuryTable[rollResult.roll]
    if (!entry) return <SimpleNarrativeEffect text="부상 표 결과 불명확" onDone={() => onDone({ tag:'부상', text:'불명확', kind:'loss' })} />

    // 부상 효과 적용 (stat_physical_minus 계열)
    const physStats = Object.keys(state.stats).filter(k => PHYSICAL_STATS.includes(k))
    const effects = entry.effects ?? []

    if (!subDone && effects.length > 0) {
      return (
        <div>
          <div className="event-card mishap" style={{ marginBottom:'0.75rem' }}>
            <div className="event-roll-label">부상 표 {rollResult.roll} — {entry.name}</div>
            <div className="event-text">{entry.text}</div>
          </div>
          {effects.map((e, i) => (
            <InjurySubEffect
              key={i}
              effect={e}
              state={state}
              actions={actions}
              onDone={(log) => {
                if (i === effects.length - 1) {
                  setSubDone(true)
                  onDone({ tag:'부상', text: entry.name, kind:'loss' })
                }
              }}
            />
          ))}
        </div>
      )
    }

    return (
      <div>
        <div className="event-card mishap" style={{ marginBottom:'0.75rem' }}>
          <div className="event-roll-label">부상 표 {rollResult.roll} — {entry.name}</div>
          <div className="event-text">{entry.text}</div>
        </div>
        <button className="btn btn-primary"
          onClick={() => onDone({ tag:'부상', text: entry.name, kind:'loss' })}
        >확인</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem', borderColor:'var(--col-red)' }}>
      <div className="card-title" style={{ fontSize:'0.85rem', color:'var(--col-red)' }}>
        부상 표 굴림
        {isSevere && <span className="badge badge-red" style={{ marginLeft:'0.5rem' }}>두 번 굴려 낮은 값</span>}
        {isHigh   && <span className="badge badge-red" style={{ marginLeft:'0.5rem' }}>두 번 굴려 높은 값</span>}
      </div>
      <DiceRollInline
        label="부상 표 — 1D"
        count={1} sides={6} mod={0}
        variant="danger"
        onResult={({ values }) => {
          let roll = values[0]
          if (isSevere) roll = Math.min(roll, Math.floor(Math.random()*6)+1)
          if (isHigh)   roll = Math.max(roll, Math.floor(Math.random()*6)+1)
          setTimeout(() => setRollResult({ roll, rolls: [roll] }), 600)
        }}
      />
    </div>
  )
}

// 부상 표 stat 효과 — effect.type별 독립 컴포넌트 (Hooks 규칙 준수)
function InjurySubEffect({ effect, state, actions, onDone }) {
  if (effect.type === 'stat_physical_minus')
    return <InjuryStatMinus effect={effect} state={state} actions={actions} onDone={onDone} />
  if (effect.type === 'stat_physical_minus_1d')
    return <InjuryStatMinus1D state={state} actions={actions} onDone={onDone} />
  if (effect.type === 'stat_choice_minus')
    return <StatChoiceEffect effect={{ stats: effect.stats, value: effect.value }} state={state} actions={actions} onDone={onDone} />
  return <button className="btn btn-ghost" onClick={() => onDone({ tag:'부상', text: effect.type, kind:'loss' })}>확인</button>
}

function InjuryStatMinus({ effect, state, actions, onDone }) {
  const [remaining, setRemaining] = useState(effect.count ?? 1)
  const [chosen,    setChosen]    = useState([])
  if (remaining === 0) {
    return (
      <button className="btn btn-ghost"
        onClick={() => onDone({ tag:'부상', text:`신체 특성치 -${effect.value} ×${effect.count}`, kind:'loss' })}>
        확인
      </button>
    )
  }
  return (
    <div className="card" style={{ marginBottom:'0.5rem' }}>
      <div className="card-title" style={{ fontSize:'0.8rem', color:'var(--col-red)' }}>
        신체 특성치 -{effect.value} 선택 (남은 횟수: {remaining})
      </div>
      <div className="choice-group">
        {PHYSICAL_STATS.map(s => (
          <button key={s} className="btn btn-danger" style={{ fontSize:'0.78rem' }}
            disabled={chosen.filter(c => c === s).length >= 1}
            onClick={() => {
              actions.applyStatChange(s, -effect.value)
              setChosen(c => [...c, s])
              setRemaining(r => r - 1)
            }}
          >
            {STAT_NAME_KO[s]} ({state.stats[s] ?? 0} → {Math.max(0,(state.stats[s] ?? 0) - effect.value)})
          </button>
        ))}
      </div>
    </div>
  )
}

function InjuryStatMinus1D({ state, actions, onDone }) {
  const [rolled, setRolled] = useState(null)
  const [picked, setPicked] = useState(null)
  if (picked && rolled) {
    return (
      <button className="btn btn-ghost"
        onClick={() => onDone({ tag:'부상', text:`${STAT_NAME_KO[picked]} -${rolled}`, kind:'loss' })}>
        확인
      </button>
    )
  }
  if (rolled && !picked) {
    return (
      <div className="card" style={{ marginBottom:'0.5rem' }}>
        <div className="card-title" style={{ fontSize:'0.8rem', color:'var(--col-red)' }}>
          신체 특성치 -{rolled} (1D 결과) — 선택
        </div>
        <div className="choice-group">
          {PHYSICAL_STATS.map(s => (
            <button key={s} className="btn btn-danger" style={{ fontSize:'0.78rem' }}
              onClick={() => { actions.applyStatChange(s, -rolled); setPicked(s) }}
            >
              {STAT_NAME_KO[s]} ({state.stats[s] ?? 0} → {Math.max(0,(state.stats[s]??0)-rolled)})
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="card" style={{ marginBottom:'0.5rem' }}>
      <div className="card-title" style={{ fontSize:'0.8rem', color:'var(--col-red)' }}>
        신체 특성치 1D만큼 감소
      </div>
      <DiceRollInline label="부상 — 1D" count={1} sides={6} mod={0} variant="danger"
        onResult={({ values }) => setTimeout(() => setRolled(values[0]), 500)} />
    </div>
  )
}
// ── 생활 사건 표 ─────────────────────────────────────────────
function LifeEventEffect({ state, actions, onDone }) {
  const [roll, setRoll] = useState(null)
  const [subDone, setSubDone] = useState(false)

  const doRoll = () => setRoll(roll2D())

  if (roll) {
    const entry = lifeEvents[roll] ?? { name: '???', text: '특이한 일이 일어납니다.', effects: [] }
    const subEffects = entry.effects ?? []

    if (subEffects.length === 0 || subDone) {
      return (
        <div>
          <div className="event-card" style={{ borderLeftColor:'var(--col-cyan)', background:'rgba(79,195,212,0.05)', marginBottom:'0.75rem' }}>
            <div className="event-roll-label">생활 사건 2D: {roll} — {entry.name}</div>
            <div className="event-text">{entry.text}</div>
          </div>
          <button className="btn btn-primary" onClick={() => onDone({ tag:'생활사건', text: entry.name, kind:'neutral' })}>
            확인
          </button>
        </div>
      )
    }

    return (
      <div>
        <div className="event-card" style={{ borderLeftColor:'var(--col-cyan)', background:'rgba(79,195,212,0.05)', marginBottom:'0.75rem' }}>
          <div className="event-roll-label">생활 사건 2D: {roll} — {entry.name}</div>
          <div className="event-text">{entry.text}</div>
        </div>
        {subEffects.map((e, i) => (
          <EffectHandler key={i} effect={e} state={state} actions={actions} isMishap={false}
            onDone={(log) => {
              if (i === subEffects.length - 1) {
                setSubDone(true)
                onDone({ tag:'생활사건', text: entry.name, kind:'neutral' })
              }
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem', borderColor:'var(--col-cyan)' }}>
      <div className="card-title" style={{ fontSize:'0.85rem', color:'var(--col-cyan)' }}>생활 사건 표 굴림</div>
      <DiceRollInline
        label="생활 사건 — 2D"
        count={2} mod={0}
        onResult={({ total }) => setTimeout(() => setRoll(total), 600)}
      />
    </div>
  )
}

// ── 기이한 사건 (1D 서브표) ───────────────────────────────────
function WeirdEventEffect({ state, actions, onDone }) {
  const [roll, setRoll] = useState(null)

  const subTable = {
    1: '초능력자 단체와 연이 닿습니다. GM과 상의하세요.',
    2: '외계 종족 사이에서 시간을 보냅니다. 학문 +1, 외계 연줄 획득.',
    3: '기묘한 외계 장치를 얻습니다.',
    4: '무슨 일이 일어났는지 기억이 나지 않습니다.',
    5: '제국의 최상층부와 잠시 접촉하게 됩니다.',
    6: '인류보다도 오래된 고대 기술을 얻습니다.',
  }

  const apply = (r) => {
    if (r === 2) {
      actions.applySkill('학문', 1)
      actions.addContact('contact', '외계 종족')
    }
    onDone({ tag:'기이한사건', text: subTable[r], kind:'neutral' })
  }

  if (roll) {
    return (
      <div className="event-card" style={{ borderLeftColor:'var(--col-gold)', marginBottom:'0.75rem' }}>
        <div className="event-roll-label">기이한 사건 1D: {roll}</div>
        <div className="event-text">{subTable[roll]}</div>
        <button className="btn btn-primary" style={{ marginTop:'0.5rem' }} onClick={() => apply(roll)}>확인</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem', borderColor:'var(--col-gold)' }}>
      <div className="card-title" style={{ fontSize:'0.85rem', color:'var(--col-gold)' }}>기이한 사건 — 1D 굴림</div>
      <DiceRollInline
        label="기이한 사건 — 1D"
        count={1} sides={6} mod={0}
        onResult={({ values }) => setTimeout(() => setRoll(values[0]), 600)}
      />
    </div>
  )
}

// ── 사고 (경력 종료 없음) ─────────────────────────────────────
function MishapNoEndEffect({ state, actions, onDone }) {
  const [roll, setRoll] = useState(null)

  if (roll) {
    return (
      <div className="event-card mishap" style={{ marginBottom:'0.75rem' }}>
        <div className="event-roll-label">⚠ 사고 굴림 1D: {roll} (경력 유지)</div>
        <div className="event-text">사고 결과가 적용됩니다. 경력은 계속됩니다.</div>
        <button className="btn btn-primary" style={{ marginTop:'0.5rem' }}
          onClick={() => onDone({ tag:'사고', text:`사고 ${roll} (경력 유지)`, kind:'loss' })}
        >확인</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem', borderColor:'var(--col-red)' }}>
      <div className="card-title" style={{ fontSize:'0.85rem', color:'var(--col-red)' }}>사고 표 굴림 (경력 유지)</div>
      <DiceRollInline
        label="사고 표 — 1D (경력 유지)"
        count={1} sides={6} mod={0}
        variant="danger"
        onResult={({ values }) => setTimeout(() => setRoll(values[0]), 600)}
      />
    </div>
  )
}

// ── 도박 선택 ─────────────────────────────────────────────────
function OptionalGambleEffect({ effect, state, actions, onDone }) {
  const [decided, setDecided] = useState(null)
  const [bet, setBet]         = useState(1)
  const [result, setResult]   = useState(null)

  if (decided === false) {
    return <SimpleNarrativeEffect text="도박을 거부했습니다." onDone={() => onDone({ tag:'도박', text:'거부', kind:'neutral' })} />
  }

  if (decided === true && result === null) {
    const doGamble = () => {
      const skill = effect.check ?? (effect.skills?.[0] ?? '도박')
      const r = checkSkill(state.skills[skill] ?? 0, effect.target ?? 8)
      setResult(r)
      if (r.success) {
        const extra = Math.ceil(bet / 2)
        for (let i = 0; i < extra; i++) actions.dispatch?.({ type: 'EXTRA_MUSTER' })
      }
    }

    return (
      <div className="card" style={{ marginBottom:'0.75rem' }}>
        <div className="card-title" style={{ fontSize:'0.85rem' }}>도박 — 베팅</div>
        <div style={{ fontSize:'0.82rem', color:'var(--col-text-muted)', marginBottom:'0.5rem' }}>
          소득 굴림 횟수를 걸고 도박합니다. 성공 시 절반 추가, 실패 시 전부 잃습니다.
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
          <span style={{ fontSize:'0.82rem' }}>베팅:</span>
          {[1,2,3].map(n => (
            <button key={n} className={`btn ${bet === n ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize:'0.75rem', padding:'0.3rem 0.6rem' }}
              onClick={() => setBet(n)}>{n}회</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={doGamble}>🎲 도박!</button>
      </div>
    )
  }

  if (result) {
    return (
      <div>
        <RollResultDisplay result={result} label={`도박 ${effect.target}+`} />
        <p style={{ fontSize:'0.8rem', color: result.success ? 'var(--col-green)' : 'var(--col-red)', marginTop:'0.5rem' }}>
          {result.success ? `성공! 소득 굴림 +${Math.ceil(bet/2)}회` : `실패. 소득 굴림 ${bet}회 손실`}
        </p>
        <button className="btn btn-primary" style={{ marginTop:'0.5rem' }}
          onClick={() => onDone({ tag:'도박', text: result.success ? `성공 (+${Math.ceil(bet/2)})` : `실패 (-${bet})`, kind: result.success?'gain':'loss' })}
        >확인</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>도박 선택</div>
      <div className="choice-group">
        <button className="btn btn-primary" onClick={() => setDecided(true)}>도박하기</button>
        <button className="btn btn-ghost"   onClick={() => setDecided(false)}>거부</button>
      </div>
    </div>
  )
}

// ── 위험한 모험 선택 ─────────────────────────────────────────
function OptionalAdventureEffect({ effect, state, actions, onDone }) {
  const [decided, setDecided] = useState(null)
  const [roll, setRoll]       = useState(null)

  if (decided === false) {
    return <SimpleNarrativeEffect text="모험을 거부했습니다." onDone={() => onDone({ tag:'모험', text:'거부', kind:'neutral' })} />
  }
  if (decided === true && roll === null) {
    return (
      <div className="card" style={{ marginBottom:'0.75rem' }}>
        <div className="card-title" style={{ fontSize:'0.85rem' }}>위험한 모험 — 결과 굴림</div>
        <button className="btn btn-primary" onClick={() => setRoll(roll1D())}>🎲 1D 굴리기</button>
      </div>
    )
  }
  if (roll !== null) {
    const text = roll <= 2 ? '부상당하거나 체포됩니다.' : roll <= 4 ? '무사히 돌아왔지만 아무것도 얻지 못했습니다.' : '모험에 성공! 소득 굴림 +4 수정치를 한 번 받습니다.'
    const kind = roll <= 2 ? 'loss' : roll <= 4 ? 'neutral' : 'gain'
    return (
      <div>
        <div className="event-card" style={{ marginBottom:'0.75rem' }}>
          <div className="event-roll-label">1D: {roll}</div>
          <div className="event-text">{text}</div>
        </div>
        <button className="btn btn-primary" onClick={() => onDone({ tag:'모험', text, kind })}>확인</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>위험한 모험 참여 여부</div>
      <div className="choice-group">
        <button className="btn btn-primary" onClick={() => setDecided(true)}>수락 (1D 굴림)</button>
        <button className="btn btn-ghost"   onClick={() => setDecided(false)}>거부</button>
      </div>
    </div>
  )
}

// ── 기능 선택 후 판정 ─────────────────────────────────────────
function SkillChoiceThenCheckEffect({ effect, state, actions, onDone }) {
  const [chosenSkill, setChosenSkill] = useState(null)
  const [result, setResult]           = useState(null)

  if (!chosenSkill) {
    return (
      <div className="card" style={{ marginBottom:'0.75rem' }}>
        <div className="card-title" style={{ fontSize:'0.85rem' }}>기능 선택 후 판정</div>
        <div className="choice-group">
          {(effect.skills ?? []).map(s => (
            <button key={s} className="btn btn-primary"
              onClick={() => { actions.applySkill(s, 1); setChosenSkill(s) }}
            >{s} +1</button>
          ))}
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="card" style={{ marginBottom:'0.75rem' }}>
        <div className="card-title" style={{ fontSize:'0.85rem' }}>판정 — {chosenSkill} {effect.check_target}+</div>
        <button className="btn btn-primary"
          onClick={() => setResult(checkSkill(state.skills[chosenSkill] ?? 1, effect.check_target))}
        >🎲 굴리기</button>
      </div>
    )
  }

  const afterEffects = result.success ? (effect.success_effect ?? []) : (effect.failure_effect ?? [])
  return (
    <div>
      <RollResultDisplay result={result} label={`${chosenSkill} ${effect.check_target}+`} />
      {afterEffects.length > 0
        ? afterEffects.map((e, i) => (
            <EffectHandler key={i} effect={e} state={state} actions={actions} isMishap={false}
              onDone={(log) => { if (i === afterEffects.length - 1) onDone({ tag:'판정', text: result.success?'성공':'실패', kind: result.success?'success':'failure' }) }}
            />
          ))
        : <button className="btn btn-primary" style={{ marginTop:'0.75rem' }}
            onClick={() => onDone({ tag:'판정', text: result.success?'성공':'실패', kind: result.success?'success':'failure' })}
          >확인</button>
      }
    </div>
  )
}

// ── 선택적 착취 (시민 사건 8) ────────────────────────────────
function OptionalExploitEffect({ effect, state, actions, onDone }) {
  const [decided, setDecided] = useState(null)

  if (decided === false) {
    return <SimpleNarrativeEffect text="착취하지 않았습니다." onDone={() => onDone({ tag:'선택', text:'거부', kind:'neutral' })} />
  }
  if (decided === true) {
    const skillToGain = (effect.skills ?? ['세상물정'])[0]
    actions.applySkill(skillToGain, 1)
    return (
      <SimpleNarrativeEffect
        text={`${skillToGain} +1 획득. 소득 굴림 +1 수정치.`}
        onDone={() => onDone({ tag:'착취', text:`${skillToGain} +1`, kind:'gain' })}
      />
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>비밀 정보 이용 여부</div>
      <div className="choice-group">
        <button className="btn btn-primary" onClick={() => setDecided(true)}>이용 (+소득 DM, +기능)</button>
        <button className="btn btn-ghost"   onClick={() => setDecided(false)}>이용 안 함</button>
      </div>
    </div>
  )
}

// ── 연줄에 부상 입히기 (요원 사고 5) ────────────────────────
function InjuryToContactEffect({ state, actions, onDone }) {
  return (
    <div className="card" style={{ marginBottom:'0.75rem', borderColor:'var(--col-red)' }}>
      <div className="card-title" style={{ fontSize:'0.85rem', color:'var(--col-red)' }}>연줄 / 조력자에게 부상</div>
      <p className="text-muted" style={{ fontSize:'0.82rem', marginBottom:'0.5rem' }}>
        연줄, 조력자, 가족 중 한 명을 선택해 부상 표 굴림(두 번, 낮은 값)을 적용합니다.
      </p>
      <button className="btn btn-danger"
        onClick={() => onDone({ tag:'부상', text:'연줄/조력자에게 부상 (별도 처리)', kind:'loss' })}
      >처리 완료</button>
    </div>
  )
}

// ── 학자 전문 분야 선택 ───────────────────────────────────────
function ScholarSpecialtyEffect({ effect, state, actions, onDone }) {
  const [count, setCount] = useState(effect.count ?? 2)
  const [picked, setPicked] = useState([])

  const scholarly = ['학문(천문학)','학문(생물학)','학문(화학)','학문(역사학)','학문(철학)','학문(고고학)']

  if (picked.length >= count) {
    return (
      <SimpleNarrativeEffect
        text={`학문 전문 분야 ${count}개 향상: ${picked.join(', ')}`}
        onDone={() => onDone({ tag:'학문', text: picked.join(', '), kind:'gain' })}
      />
    )
  }

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>학문 전문 분야 선택 ({picked.length}/{count})</div>
      <div className="choice-group">
        {scholarly.filter(s => !picked.includes(s)).map(s => (
          <button key={s} className="btn btn-primary" style={{ fontSize:'0.75rem' }}
            onClick={() => { actions.applySkill(s, 1); setPicked(p => [...p, s]) }}
          >{s}</button>
        ))}
      </div>
    </div>
  )
}

// ── 기능 또는 연줄 선택 ───────────────────────────────────────
function SkillOrContactEffect({ effect, state, actions, onDone }) {
  const options = [
    ...(effect.skills ?? []).map(s => ({ label:`${s} +1`, type:'skill', skill:s })),
    ...(effect.contact ? [{ label:'연줄 1명', type:'contact' }] : []),
  ]

  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <div className="card-title" style={{ fontSize:'0.85rem' }}>기능 또는 연줄 선택</div>
      <div className="choice-group">
        {options.map((opt, i) => (
          <button key={i} className="btn btn-primary"
            onClick={() => {
              if (opt.type === 'skill') actions.applySkill(opt.skill, 1)
              else actions.addContact('contact', '')
              onDone({ tag:opt.type==='skill'?'기능':'연줄', text: opt.label, kind:'gain' })
            }}
          >{opt.label}</button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  재사용 UI 조각들
// ─────────────────────────────────────────────────────────────

// ─── 선택 후 sub-effects 순차 처리 큐 ───────────────────────
function ChoiceSubQueue({ label, effects, state, actions, isMishap, onDone }) {
  const [idx, setIdx]  = useState(0)
  const [logs, setLogs] = useState([])

  const current = effects[idx]

  if (!current) {
    // 모두 완료
    return (
      <div>
        <div style={{ padding:'0.25rem 0', fontSize:'0.8rem', color:'var(--col-gold)', fontFamily:'var(--font-mono)', marginBottom:'0.5rem' }}>
          ✓ 선택: {label}
        </div>
        {logs.map((l, i) => <LogEntry key={i} log={l} />)}
        <button className="btn btn-ghost" style={{ marginTop:'0.5rem' }}
          onClick={() => onDone({ tag:'선택', text: label, kind:'neutral' })}
        >확인</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding:'0.25rem 0', fontSize:'0.8rem', color:'var(--col-gold)', fontFamily:'var(--font-mono)', marginBottom:'0.5rem' }}>
        ✓ 선택: {label} ({idx + 1}/{effects.length})
      </div>
      {logs.map((l, i) => <LogEntry key={i} log={l} />)}
      <EffectHandler
        key={`choice-sub-${idx}`}
        effect={current}
        state={state}
        actions={actions}
        isMishap={isMishap}
        onDone={(log) => {
          if (log) setLogs(prev => [...prev, log])
          setIdx(i => i + 1)
        }}
      />
    </div>
  )
}

function ConfirmCard({ label, color, detail, onConfirm }) {
  return (
    <div className="card" style={{ marginBottom:'0.75rem', borderColor: color ?? 'var(--col-border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <span style={{ color: color ?? 'var(--col-text)', fontWeight:500, fontSize:'0.88rem' }}>{label}</span>
          {detail && <p style={{ fontSize:'0.78rem', color:'var(--col-text-muted)', marginTop:'0.2rem' }}>{detail}</p>}
        </div>
        <button className="btn btn-primary" style={{ borderColor: color, color: color, background:`${color}15`, flexShrink:0, marginLeft:'1rem' }}
          onClick={onConfirm}
        >적용</button>
      </div>
    </div>
  )
}

function RollResultDisplay({ result, label }) {
  return (
    <div className={`roll-result ${result.success ? 'success' : 'failure'}`} style={{ marginBottom:'0.5rem' }}>
      <div className={`roll-total ${result.success ? 'success' : 'failure'}`}>{result.total}</div>
      <div className="roll-detail">
        {label}<br />
        2D({result.roll}) + DM({result.mod ?? 0}) = {result.total} → {result.success ? '성공' : '실패'}
      </div>
    </div>
  )
}

function SimpleNarrativeEffect({ text, onDone }) {
  return (
    <div className="card" style={{ marginBottom:'0.75rem' }}>
      <p style={{ fontSize:'0.85rem', marginBottom:'0.5rem' }}>{text}</p>
      <button className="btn btn-ghost" onClick={onDone}>확인</button>
    </div>
  )
}
