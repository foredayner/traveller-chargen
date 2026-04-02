// ─────────────────────────────────────────────────────────────
//  App.jsx
//  메인 앱 셸. SF 항성도 스타일의 디자인.
//  Cinzel (라틴 세리프) + Noto Serif KR (한글) + Share Tech Mono (숫자)
// ─────────────────────────────────────────────────────────────

import { useCharacterContext } from './store/CharacterContext.jsx'
import { STEPS } from './store/stepReducer.js'

// Step 컴포넌트들 (각각 별도 파일)
import StepStats      from './components/steps/StepStats.jsx'
import StepBackground from './components/steps/StepBackground.jsx'
import StepPreCareer  from './components/steps/StepPreCareer.jsx'
import StepCareer     from './components/steps/StepCareer.jsx'
import StepTerm       from './components/steps/StepTerm.jsx'
import StepFinish     from './components/steps/StepFinish.jsx'

const STEP_LABELS = [
  { step: STEPS.STATS,      label: '특성치',  sublabel: 'Characteristics' },
  { step: STEPS.BACKGROUND, label: '배경',    sublabel: 'Background'      },
  { step: STEPS.PRE_CAREER, label: '전교육',  sublabel: 'Education'       },
  { step: STEPS.CAREER,     label: '경력',    sublabel: 'Career'          },
  { step: STEPS.TERM,       label: '주기',    sublabel: 'Term'            },
  { step: STEPS.FINISH,     label: '완성',    sublabel: 'Complete'        },
]

export default function App() {
  const { state, step, actions } = useCharacterContext()

  return (
    <div className="app-shell">
      {/* ── 배경 장식 (별 / 격자) ── */}
      <div className="bg-stars" aria-hidden="true">
        {Array.from({ length: 60 }, (_, i) => (
          <span
            key={i}
            className="star"
            style={{
              left:  `${Math.random() * 100}%`,
              top:   `${Math.random() * 100}%`,
              '--delay': `${(Math.random() * 4).toFixed(2)}s`,
              '--size':  `${(Math.random() * 2 + 1).toFixed(1)}px`,
            }}
          />
        ))}
      </div>

      {/* ── 헤더 ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title-group">
            <span className="header-eyebrow">TRAVELLER RPGR</span>
            <h1 className="header-title">여행자 만들기</h1>
          </div>

          {/* 이름 표시 */}
          {state.name && (
            <div className="header-char-name">
              <span className="char-label">여행자</span>
              <span className="char-name">{state.name}</span>
            </div>
          )}

          {/* 리셋 버튼 */}
          <button
            className="btn-reset"
            onClick={() => {
              if (window.confirm('처음부터 다시 시작하시겠습니까?')) {
                actions.resetCharacter()
              }
            }}
            title="처음부터 다시 시작"
          >
            ↺ 리셋
          </button>
        </div>
      </header>

      {/* ── 스텝 진행 표시 ── */}
      <nav className="step-nav" aria-label="캐릭터 생성 단계">
        <div className="step-track">
          {STEP_LABELS.map(({ step: s, label, sublabel }, i) => {
            const status =
              step > s  ? 'done'
              : step === s ? 'active'
              : 'pending'
            return (
              <div key={s} className={`step-node step-node--${status}`}>
                <div className="step-pip">
                  {status === 'done' ? '✓' : i + 1}
                </div>
                <div className="step-info">
                  <span className="step-label">{label}</span>
                  <span className="step-sublabel">{sublabel}</span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`step-connector step-connector--${status === 'done' ? 'done' : 'pending'}`} />
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* ── 메인 콘텐츠 ── */}
      <main className="app-main">
        <div className="step-panel">
          {step === STEPS.STATS      && <StepStats />}
          {step === STEPS.BACKGROUND && <StepBackground />}
          {step === STEPS.PRE_CAREER && <StepPreCareer />}
          {step === STEPS.CAREER     && <StepCareer key={`career-${state.careers.length}`} />}
          {step === STEPS.TERM       && <StepTerm   key={`term-${state.currentCareer}-${state.currentTerm}`} />}
          {step === STEPS.FINISH     && <StepFinish />}
        </div>
      </main>

      {/* ── 푸터 ── */}
      <footer className="app-footer">
        <span>Traveller © Mongoose Publishing 2020 — 팬 제작 툴</span>
        <span className="footer-age">
          {state.age > 18 ? `나이 ${state.age}세` : ''}
        </span>
      </footer>
    </div>
  )
}
