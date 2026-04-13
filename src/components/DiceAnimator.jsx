// ─────────────────────────────────────────────────────────────
//  DiceAnimator.jsx
//
//  트래블러용 주사위 애니메이션 컴포넌트 모음.
//
//  export:
//    <DiceRollButton>   — 버튼 클릭 → 애니메이션 → 결과 표시
//    <DiceFace>         — 단일 주사위 면 표시 (점 패턴)
//    <RollDisplay>      — 2D 결과 + 수정치 + 성공/실패 배너
//    useDiceRoll()      — 훅: 굴림 로직 + 애니메이션 상태
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── 주사위 점 패턴 (1~6) ─────────────────────────────────────
// 각 점의 [col, row] 위치 (3×3 그리드, 0-based)
const DOT_POSITIONS = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[2,0],[0,2],[2,2]],
  5: [[0,0],[2,0],[1,1],[0,2],[2,2]],
  6: [[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]],
}

// ─── 애니메이션 파라미터 ──────────────────────────────────────
const ANIM_FRAMES   = 12   // 총 프레임 수
const ANIM_INTERVAL = 55   // ms — 초반 빠르게
const ANIM_SLOWDOWN = 1.35 // 프레임마다 간격 배율 (감속 효과)

// ─────────────────────────────────────────────────────────────
//  훅: useDiceRoll
//  굴림 수행 + 애니메이션 상태 관리
// ─────────────────────────────────────────────────────────────
export function useDiceRoll({ sides = 6, count = 2, onResult } = {}) {
  const [values, setValues]       = useState(null)   // 현재 표시 값 배열
  const [finalValues, setFinal]   = useState(null)   // 최종 확정 값
  const [rolling, setRolling]     = useState(false)
  const [phase, setPhase]         = useState('idle') // idle|rolling|settled
  const timerRef = useRef(null)
  const frameRef = useRef(0)
  const intervalRef = useRef(ANIM_INTERVAL)

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  // 애니메이션 루프
  const animate = useCallback((finals, frame = 0, interval = ANIM_INTERVAL) => {
    if (frame >= ANIM_FRAMES) {
      // 마지막 프레임 → 최종값 표시
      setValues([...finals])
      setFinal([...finals])
      setRolling(false)
      setPhase('settled')
      onResult?.(finals)
      return
    }

    // 중간 프레임: 랜덤값 (마지막 2프레임만 최종값에 수렴)
    const isNearEnd = frame >= ANIM_FRAMES - 2
    const display = finals.map(f =>
      isNearEnd ? f : Math.floor(Math.random() * sides) + 1
    )
    setValues(display)
    frameRef.current = frame

    // 감속: 뒤로 갈수록 느려짐
    const nextInterval = Math.min(interval * ANIM_SLOWDOWN, 300)
    timerRef.current = setTimeout(
      () => animate(finals, frame + 1, nextInterval),
      interval
    )
  }, [sides, onResult])

  const roll = useCallback(() => {
    clearTimer()
    setPhase('rolling')
    setRolling(true)
    setFinal(null)

    const finals = Array.from({ length: count }, () =>
      Math.floor(Math.random() * sides) + 1
    )
    animate(finals, 0, ANIM_INTERVAL)
  }, [count, sides, animate])

  const reset = useCallback(() => {
    clearTimer()
    setValues(null)
    setFinal(null)
    setRolling(false)
    setPhase('idle')
  }, [])

  useEffect(() => () => clearTimer(), [])

  return { values, finalValues, rolling, phase, roll, reset }
}

// ─────────────────────────────────────────────────────────────
//  DiceFace — 단일 주사위 면 (점 패턴 SVG)
// ─────────────────────────────────────────────────────────────
export function DiceFace({
  value,
  size = 52,
  color = 'var(--col-cyan)',
  glowing = false,
  rolling = false,
  dim = false,
}) {
  const dots = DOT_POSITIONS[value] ?? []
  const pad  = size * 0.14
  const cell = (size - pad * 2) / 3
  const r    = size * 0.08  // 점 반지름
  const borderR = size * 0.14

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        display: 'block',
        filter: glowing ? `drop-shadow(0 0 ${size * 0.14}px ${color})` : 'none',
        opacity: dim ? 0.3 : 1,
        transition: 'opacity 0.2s, filter 0.2s',
        animation: rolling ? 'diceShake 0.08s ease-in-out infinite alternate' : 'none',
        flexShrink: 0,
      }}
    >
      {/* 주사위 몸체 */}
      <rect
        x={1} y={1}
        width={size - 2} height={size - 2}
        rx={borderR}
        fill="var(--col-deep)"
        stroke={color}
        strokeWidth={rolling ? 1.5 : 1}
        style={{ transition: 'stroke-width 0.1s' }}
      />
      {/* 내부 미세 테두리 (SF 느낌) */}
      <rect
        x={4} y={4}
        width={size - 8} height={size - 8}
        rx={borderR - 2}
        fill="none"
        stroke={color}
        strokeWidth={0.4}
        opacity={0.35}
      />
      {/* 점들 */}
      {dots.map(([col, row], i) => {
        const cx = pad + col * cell + cell / 2
        const cy = pad + row * cell + cell / 2
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill={color}
            style={{
              filter: glowing ? `drop-shadow(0 0 ${r * 1.5}px ${color})` : 'none',
            }}
          />
        )
      })}
      {/* 값 숫자 (6은 점이 많아서 숫자 생략, 1은 작게 표시) */}
      {value === undefined && (
        <text
          x={size / 2} y={size / 2 + 1}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.38}
          fontFamily="var(--font-mono)"
          fill={color}
          opacity={0.6}
        >?</text>
      )}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
//  RollDisplay — 굴림 결과 전체 표시 (주사위 + 수식 + 판정)
// ─────────────────────────────────────────────────────────────
export function RollDisplay({
  values,          // 주사위 값 배열 [d1, d2] 또는 [d1]
  mod = 0,         // 수정치 (DM)
  target,          // 목표값 (있으면 판정 표시)
  label,           // "지능 8+" 같은 설명 텍스트
  rolling = false,
  success,         // 외부에서 override 가능
}) {
  if (!values) return null

  const total   = values.reduce((s, v) => s + v, 0) + mod
  const passed  = success !== undefined ? success : (target !== undefined ? total >= target : null)
  const diceSum = values.reduce((s, v) => s + v, 0)

  const resultColor = passed === null
    ? 'var(--col-cyan)'
    : passed ? 'var(--col-green)' : 'var(--col-red)'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1.25rem 1rem',
      background: 'var(--col-deep)',
      borderRadius: 'var(--radius-lg)',
      border: `1px solid ${passed === true ? 'var(--col-green)' : passed === false ? 'var(--col-red)' : 'var(--col-border)'}`,
      transition: 'border-color 0.3s',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 배경 glow */}
      {!rolling && passed !== null && (
        <div style={{
          position: 'absolute', inset: 0,
          background: passed
            ? 'radial-gradient(ellipse at center, rgba(82,201,122,0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(224,82,82,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* 주사위들 */}
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        {values.map((v, i) => (
          <DiceFace
            key={i}
            value={v}
            size={56}
            color={rolling ? 'var(--col-gold)' : resultColor}
            glowing={!rolling && passed !== null}
            rolling={rolling}
          />
        ))}
      </div>

      {/* 수식 라인 */}
      {!rolling && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--col-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          letterSpacing: '0.04em',
        }}>
          {values.length > 1 && (
            <>
              <span style={{ color: 'var(--col-text-dim)' }}>({values.join('+')})</span>
              <span style={{ color: 'var(--col-text-dim)', fontSize: '0.7rem' }}>=</span>
              <span>{diceSum}</span>
            </>
          )}
          {mod !== 0 && (
            <>
              <span style={{ color: 'var(--col-text-dim)', fontSize: '0.7rem' }}>
                {mod > 0 ? '+' : ''}
              </span>
              <span style={{ color: mod > 0 ? 'var(--col-green)' : 'var(--col-red)' }}>
                DM{mod > 0 ? '+' : ''}{mod}
              </span>
            </>
          )}
          {target !== undefined && (
            <>
              <span style={{ color: 'var(--col-text-dim)', margin: '0 0.1rem' }}>=</span>
              <span style={{ color: resultColor, fontSize: '0.9rem', fontWeight: 500 }}>
                {total}
              </span>
              <span style={{ color: 'var(--col-text-dim)', fontSize: '0.7rem', margin: '0 0.2rem' }}>
                vs
              </span>
              <span style={{ color: 'var(--col-text-muted)' }}>{target}+</span>
            </>
          )}
        </div>
      )}

      {/* 판정 결과 배너 */}
      {!rolling && passed !== null && (
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.85rem',
          letterSpacing: '0.12em',
          color: resultColor,
          textShadow: `0 0 16px ${resultColor}`,
          animation: 'resultPop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}>
          {passed ? '성공' : '실패'}
        </div>
      )}

      {/* 라벨 */}
      {label && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          color: 'var(--col-text-dim)',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  DiceRollButton — 메인 공개 컴포넌트
//
//  사용법:
//    <DiceRollButton
//      label="생존 굴림"        // 버튼 텍스트
//      sides={6}               // 주사위 면 수 (기본 6)
//      count={2}               // 주사위 개수 (기본 2)
//      mod={statMod}           // 수정치 DM
//      target={7}              // 목표값 (판정 표시)
//      onResult={fn}           // fn({ values, total, success })
//      variant="primary"       // "primary"|"danger"|"ghost"
//      disabled={false}
//      autoRoll={false}        // mount 시 자동 굴림
//    />
// ─────────────────────────────────────────────────────────────
export default function DiceRollButton({
  label       = '굴리기',
  sides       = 6,
  count       = 2,
  mod         = 0,
  target,
  onResult,
  variant     = 'primary',
  disabled    = false,
  autoRoll    = false,
  size        = 'md',       // 'sm' | 'md' | 'lg'
  className   = '',
}) {
  const { values, finalValues, rolling, phase, roll } = useDiceRoll({
    sides,
    count,
    onResult: useCallback((vals) => {
      const total   = vals.reduce((s, v) => s + v, 0) + mod
      const success = target !== undefined ? total >= target : undefined
      onResult?.({ values: vals, total, success, mod })
    }, [mod, target, onResult]),
  })

  // 자동 굴림
  useEffect(() => {
    if (autoRoll) roll()
  }, [])  // eslint-disable-line

  const hasResult = phase === 'settled'

  const btnColors = {
    primary: { border: 'var(--col-gold)',   color: 'var(--col-gold)',  bg: 'rgba(200,168,75,0.08)' },
    danger:  { border: 'var(--col-red)',    color: 'var(--col-red)',   bg: 'rgba(224,82,82,0.08)' },
    ghost:   { border: 'var(--col-border)', color: 'var(--col-text-muted)', bg: 'transparent' },
  }
  const c = btnColors[variant] ?? btnColors.primary

  const sizeMap = {
    sm: { padding: '0.35rem 0.9rem',  fontSize: '0.78rem', iconSize: 36 },
    md: { padding: '0.55rem 1.2rem',  fontSize: '0.88rem', iconSize: 44 },
    lg: { padding: '0.75rem 1.6rem',  fontSize: '1rem',    iconSize: 52 },
  }
  const sz = sizeMap[size] ?? sizeMap.md

  return (
    <div className={`dice-roll-btn-wrap ${className}`} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>

      {/* ── 버튼 ── */}
      {!hasResult && (
        <button
          className="dice-roll-btn"
          disabled={disabled || rolling}
          onClick={roll}
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '0.5rem',
            padding:        sz.padding,
            fontSize:       sz.fontSize,
            fontFamily:     'var(--font-body)',
            fontWeight:     500,
            border:         `1.5px solid ${c.border}`,
            borderRadius:   'var(--radius-md)',
            background:     rolling ? `${c.bg}` : c.bg,
            color:          c.color,
            cursor:         disabled || rolling ? 'not-allowed' : 'pointer',
            opacity:        disabled ? 0.4 : 1,
            transition:     'all 0.15s ease',
            letterSpacing:  '0.02em',
            position:       'relative',
            overflow:       'hidden',
          }}
        >
          {/* 버튼 shimmer 효과 (굴리는 중) */}
          {rolling && (
            <span style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(90deg, transparent 0%, ${c.bg.replace('0.08','0.2')} 50%, transparent 100%)`,
              animation: 'shimmer 0.6s linear infinite',
              pointerEvents: 'none',
            }} />
          )}

          {/* 인라인 주사위 미리보기 (굴리는 동안 작은 주사위 표시) */}
          <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {rolling && values
              ? values.map((v, i) => (
                  <DiceFace key={i} value={v} size={sz.iconSize * 0.6} color={c.color} rolling={true} />
                ))
              : <DieSVGIcon size={sz.iconSize * 0.5} color={c.color} />
            }
          </span>

          <span style={{ position: 'relative' }}>
            {rolling ? '굴리는 중…' : label}
          </span>
        </button>
      )}

      {/* ── 결과 표시 ── */}
      {hasResult && finalValues && (
        <RollDisplay
          values={finalValues}
          mod={mod}
          target={target}
          label={label}
          rolling={false}
        />
      )}

      {/* ── 다시 굴리기 (결과 후) ── */}
      {hasResult && (
        <button
          onClick={roll}
          disabled={disabled}
          style={{
            fontFamily:   'var(--font-mono)',
            fontSize:     '0.65rem',
            letterSpacing:'0.1em',
            color:        'var(--col-text-dim)',
            background:   'none',
            border:       '1px solid var(--col-border)',
            borderRadius: 'var(--radius-sm)',
            padding:      '0.2rem 0.6rem',
            cursor:       'pointer',
            transition:   'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.target.style.color='var(--col-text-muted)'; e.target.style.borderColor='var(--col-border-lit)' }}
          onMouseLeave={e => { e.target.style.color='var(--col-text-dim)'; e.target.style.borderColor='var(--col-border)' }}
        >
          ↺ 다시 굴리기
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  DiceRollInline — 판정 UI 통합 컴포넌트
//
//  props:
//    label        : 판정 이름 (예: "생존 굴림")
//    stat         : 판정 특성치 이름 (예: "인내")
//    target       : 목표 수치 (예: 5) — 없으면 단순 굴림
//    count        : 주사위 개수 (기본 2)
//    sides        : 주사위 면수 (기본 6)
//    mod          : 총 수정치 합계
//    breakdown    : DM 출처 배열 [{ label, value }]
//                   예: [{ label:'인내 수정치', value:+1 }, { label:'졸업 DM', value:+2 }]
//    onResult     : (result) => void  — 굴림 직후 호출
//    onNext       : () => void        — "다음 →" 버튼 클릭 시 호출
//    variant      : 'primary'|'danger'
//    disabled     : boolean
// ─────────────────────────────────────────────────────────────
export function DiceRollInline({
  label,
  stat,
  target,
  sides    = 6,
  count    = 2,
  mod      = 0,
  breakdown = [],
  onResult,
  onNext,
  variant  = 'primary',
  disabled = false,
}) {
  const [phase, setPhase]     = useState('idle')   // idle|rolling|done
  const [displayVals, setDisp]= useState(null)
  const [finalVals, setFinal] = useState(null)
  const timerRef = useRef(null)
  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current) }
  useEffect(() => () => clearTimer(), [])

  const doRoll = () => {
    if (phase !== 'idle') return
    clearTimer()
    setPhase('rolling')
    setFinal(null)
    const finals = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1)
    let frame = 0, interval = ANIM_INTERVAL
    const tick = () => {
      if (frame >= ANIM_FRAMES) {
        setDisp([...finals]); setFinal([...finals]); setPhase('done')
        const total   = finals.reduce((s,v)=>s+v,0) + mod
        const success = target !== undefined ? total >= target : undefined
        onResult?.({ values: finals, total, success, mod })
        return
      }
      const isNear = frame >= ANIM_FRAMES - 2
      setDisp(finals.map(f => isNear ? f : Math.floor(Math.random()*sides)+1))
      frame++
      interval = Math.min(interval * ANIM_SLOWDOWN, 280)
      timerRef.current = setTimeout(tick, interval)
    }
    tick()
  }

  const rawTotal  = finalVals ? finalVals.reduce((s,v)=>s+v,0) : null
  const total     = rawTotal !== null ? rawTotal + mod : null
  const success   = total !== null && target !== undefined ? total >= target : null
  const rolling   = phase === 'rolling'
  const done      = phase === 'done'

  const accentColor = success === true  ? 'var(--col-green)'
                    : success === false ? 'var(--col-red)'
                    : variant === 'danger' ? 'var(--col-red)'
                    : 'var(--col-gold)'

  return (
    <div style={{
      border:`1.5px solid ${done ? accentColor : 'var(--col-border)'}`,
      borderRadius:'var(--radius-lg)',
      overflow:'hidden',
      transition:'border-color 0.3s',
    }}>
      {/* ── 헤더: 판정 이름 + 난이도 ── */}
      <div style={{
        padding:'0.6rem 1rem',
        background:'rgba(255,255,255,0.02)',
        borderBottom:`1px solid var(--col-border)`,
        display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--col-text)', letterSpacing:'0.05em' }}>
          {label}
        </div>
        {target !== undefined && (
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--col-text-muted)' }}>
            {stat && <span style={{ color:'var(--col-cyan)' }}>{stat} </span>}
            <span style={{ color:accentColor, fontWeight:600 }}>{target}+</span>
            {` (목표 ${target})`}
          </div>
        )}
      </div>

      {/* ── 본문 ── */}
      <div style={{ padding:'0.75rem 1rem' }}>

        {/* DM 출처 목록 */}
        {breakdown.length > 0 && (
          <div style={{
            marginBottom:'0.65rem',
            padding:'0.4rem 0.6rem',
            background:'rgba(255,255,255,0.02)',
            borderRadius:'var(--radius-sm)',
            border:'1px solid var(--col-border)',
          }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.6rem', color:'var(--col-text-dim)', letterSpacing:'0.1em', marginBottom:'3px' }}>
              수정치 출처
            </div>
            {breakdown.map((b, i) => (
              <div key={i} style={{
                display:'flex', justifyContent:'space-between',
                fontFamily:'var(--font-mono)', fontSize:'0.72rem',
                color: b.value > 0 ? 'var(--col-green)' : b.value < 0 ? 'var(--col-red)' : 'var(--col-text-muted)',
                padding:'1px 0',
              }}>
                <span style={{ color:'var(--col-text-muted)' }}>{b.label}</span>
                <span style={{ fontWeight:500 }}>{b.value > 0 ? '+' : ''}{b.value}</span>
              </div>
            ))}
            {breakdown.length > 1 && (
              <div style={{
                display:'flex', justifyContent:'space-between',
                fontFamily:'var(--font-mono)', fontSize:'0.72rem',
                borderTop:'1px solid var(--col-border)', marginTop:'3px', paddingTop:'3px',
                color:'var(--col-text)',
              }}>
                <span>합계</span>
                <span style={{ fontWeight:600, color: mod > 0 ? 'var(--col-green)' : mod < 0 ? 'var(--col-red)' : 'var(--col-text-muted)' }}>
                  {mod > 0 ? '+' : ''}{mod}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 주사위 + 굴리기 버튼 */}
        {!done && (
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div style={{ display:'flex', gap:'0.3rem' }}>
              {(displayVals ?? Array(count).fill(undefined)).map((v, i) => (
                <DiceFace key={i} value={v} size={44} color={accentColor} rolling={rolling} dim={!displayVals} />
              ))}
            </div>
            <div style={{ flex:1 }}>
              {rolling ? (
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--col-text-muted)' }}>
                  굴리는 중…
                </div>
              ) : (
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.7rem', color:'var(--col-text-dim)' }}>
                  {count}D{sides}{mod !== 0 ? ` + (${mod > 0 ? '+' : ''}${mod})` : ''}{target !== undefined ? ` vs ${target}+` : ''}
                </div>
              )}
            </div>
            {!rolling && (
              <button
                disabled={disabled}
                onClick={doRoll}
                style={{
                  fontFamily:'var(--font-body)', fontSize:'0.85rem',
                  padding:'0.45rem 1.1rem',
                  border:`1.5px solid ${accentColor}`,
                  borderRadius:'var(--radius-md)',
                  background:`rgba(${variant==='danger'?'224,82,82':'200,168,75'},0.1)`,
                  color: accentColor,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                  whiteSpace:'nowrap', letterSpacing:'0.02em',
                }}
              >
                🎲 굴리기
              </button>
            )}
          </div>
        )}

        {/* 결과 화면 */}
        {done && finalVals && (
          <div>
            {/* 주사위 + 수식 */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.75rem' }}>
              <div style={{ display:'flex', gap:'0.3rem' }}>
                {finalVals.map((v, i) => (
                  <DiceFace key={i} value={v} size={44} color={accentColor} glowing />
                ))}
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem', color:'var(--col-text-muted)' }}>
                {count > 1 ? `(${finalVals.join(' + ')})` : finalVals[0]}
                {mod !== 0 && (
                  <span style={{ color: mod>0?'var(--col-green)':'var(--col-red)' }}>
                    {' '}{mod>0?'+':''}{mod}
                  </span>
                )}
                {' '}={' '}
                <span style={{ fontSize:'1.1rem', fontWeight:700, color:accentColor }}>
                  {total}
                </span>
                {target !== undefined && (
                  <span style={{ fontSize:'0.72rem', color:'var(--col-text-dim)', marginLeft:'0.3rem' }}>
                    vs {target}+
                  </span>
                )}
              </div>
            </div>

            {/* 성공/실패 배너 */}
            {success !== null && (
              <div style={{
                padding:'0.55rem 0.9rem',
                borderRadius:'var(--radius-md)',
                background: success ? 'rgba(82,201,122,0.08)' : 'rgba(224,82,82,0.08)',
                border:`1px solid ${success?'var(--col-green)':'var(--col-red)'}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                marginBottom: onNext ? '0.75rem' : '0',
              }}>
                <div style={{
                  fontFamily:'var(--font-display)', fontSize:'0.95rem',
                  color: success ? 'var(--col-green)' : 'var(--col-red)',
                  letterSpacing:'0.1em',
                }}>
                  {success ? '✓ 성공' : '✗ 실패'}
                </div>
                {target !== undefined && (
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.68rem', color:'var(--col-text-dim)' }}>
                    {total} {success ? '≥' : '<'} {target}
                  </div>
                )}
              </div>
            )}

            {/* 다음 버튼 */}
            {onNext && (
              <button
                className="btn btn-primary"
                onClick={onNext}
                style={{ width:'100%', marginTop:'0' }}
              >
                다음 →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  StatRollSet — 특성치 6개 동시 굴림 (StepStats 전용)
// ─────────────────────────────────────────────────────────────
export function StatRollSet({ onResult, rolling: externalRolling }) {
  const [frames, setFrames] = useState(Array(6).fill(null))
  const [final, setFinal]   = useState(null)
  const [active, setActive] = useState(false)
  const timers = useRef([])

  const clearAll = () => timers.current.forEach(clearTimeout)

  const rollAll = useCallback(() => {
    clearAll()
    setActive(true)
    setFinal(null)

    // 6개 주사위 각각 독립적으로 최종값 결정
    const finals = Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1
    )

    // 각 주사위마다 약간씩 다른 타이밍으로 시작 (캐스케이드 효과)
    finals.forEach((finalVal, di) => {
      let frame = 0
      let interval = ANIM_INTERVAL + di * 18  // 약간씩 지연

      const singleFinals = [finalVal]

      const tick = () => {
        if (frame >= ANIM_FRAMES + di) {
          setFrames(prev => {
            const next = [...prev]
            next[di] = finalVal
            return next
          })
          if (di === 5) {
            setActive(false)
            setFinal(finals)
            onResult?.(finals)
          }
          return
        }
        const isNear = frame >= ANIM_FRAMES - 2 + di
        const display = isNear ? finalVal : Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1
        setFrames(prev => {
          const next = [...prev]
          next[di] = display
          return next
        })
        frame++
        interval = Math.min(interval * ANIM_SLOWDOWN, 300)
        timers.current[di] = setTimeout(tick, interval)
      }
      timers.current[di] = setTimeout(tick, di * 40)
    })
  }, [onResult])

  useEffect(() => () => clearAll(), [])

  // 외부에서 rolling trigger
  useEffect(() => {
    if (externalRolling) rollAll()
  }, [externalRolling])

  return { frames, final, active, rollAll }
}

// ─────────────────────────────────────────────────────────────
//  내부 유틸 컴포넌트
// ─────────────────────────────────────────────────────────────

// 주사위 아이콘 SVG (버튼 내부용 작은 d6)
function DieSVGIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display:'block', flexShrink:0 }}>
      <rect x="1" y="1" width="18" height="18" rx="4" fill="none" stroke={color} strokeWidth="1.5"/>
      <circle cx="6.5" cy="6.5" r="1.5" fill={color}/>
      <circle cx="13.5" cy="6.5" r="1.5" fill={color}/>
      <circle cx="6.5" cy="13.5" r="1.5" fill={color}/>
      <circle cx="13.5" cy="13.5" r="1.5" fill={color}/>
    </svg>
  )
}
