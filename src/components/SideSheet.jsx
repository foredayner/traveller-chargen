// ─────────────────────────────────────────────────────────────
//  SideSheet.jsx — 우측 실시간 캐릭터 시트 패널
// ─────────────────────────────────────────────────────────────
import { useCharacterContext } from '../store/CharacterContext.jsx'

const STAT_KEYS = ['str','dex','end','int','edu','soc']
const STAT_EN   = {str:'STR',dex:'DEX',end:'END',int:'INT',edu:'EDU',soc:'SOC'}
const STAT_KO   = {str:'근력',dex:'민첩',end:'인내',int:'지능',edu:'교육',soc:'지위'}
const MOD_T     = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]
const mod       = v => MOD_T[Math.min(15,Math.max(0,v??0))]??0
const modStr    = v => { const m=mod(v); return m>=0?`+${m}`:`${m}` }
const hexUPP    = v => v>=10?String.fromCharCode(55+v):String(v)

const CONTACT_COLOR = {ally:'var(--col-green)',contact:'var(--col-cyan)',rival:'var(--col-amber)',enemy:'var(--col-red)'}
const CONTACT_LABEL = {ally:'조력자',contact:'연줄',rival:'경쟁자',enemy:'적수'}

export default function SideSheet() {
  const { state, derived } = useCharacterContext()
  const { stats, skills, contacts, cash, benefits, careers, age, name, homeworld } = state

  const hasStats = Object.values(stats).some(v => v > 0)
  const uppStr   = hasStats
    ? STAT_KEYS.map(k => hexUPP(stats[k]??0)).join('')
    : '??????'

  return (
    <aside className="side-sheet">
      {/* 헤더 */}
      <div className="side-sheet__header">
        <div style={{fontFamily:'var(--font-display)',fontSize:'0.75rem',letterSpacing:'0.12em',color:'var(--col-gold)',marginBottom:'2px'}}>
          여행자 시트
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--col-text-dim)',letterSpacing:'0.08em'}}>
          LIVE CHARACTER SHEET
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="side-section">
        <div className="side-label">이름 / 종족</div>
        <div className="side-value" style={{fontFamily:'var(--font-display)',color:'var(--col-gold)'}}>
          {name||'—'} <span style={{color:'var(--col-text-muted)',fontSize:'0.7rem'}}>{state.species==='human'?'인간':state.species}</span>
        </div>
        {homeworld && <div style={{fontSize:'0.72rem',color:'var(--col-text-muted)'}}>고향: {homeworld}</div>}
        <div style={{fontFamily:'var(--font-mono)',fontSize:'0.68rem',color:'var(--col-text-muted)',marginTop:'2px'}}>
          나이 {age}세 · 주기 {careers.length}회
        </div>
      </div>

      {/* UPP */}
      {hasStats && (
        <div className="side-section">
          <div className="side-label">공용 특성 지표 (UPP)</div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'1.1rem',letterSpacing:'0.15em',color:'var(--col-cyan)'}}>
            {uppStr}
          </div>
        </div>
      )}

      {/* 특성치 */}
      <div className="side-section">
        <div className="side-label">특성치</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'4px'}}>
          {STAT_KEYS.map(k=>{
            const v=stats[k]??0
            const m=mod(v)
            return (
              <div key={k} style={{
                background:'var(--col-deep)',border:`1px solid ${hasStats?'var(--col-border)':'var(--col-border)'}`,
                borderRadius:'4px',padding:'4px 6px',textAlign:'center',
              }}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.6rem',color:'var(--col-text-dim)',letterSpacing:'0.08em'}}>{STAT_EN[k]}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'1.1rem',color:hasStats?'var(--col-cyan)':'var(--col-text-dim)',lineHeight:1}}>
                  {hasStats?v:'—'}
                </div>
                {hasStats&&<div style={{fontFamily:'var(--font-mono)',fontSize:'0.58rem',color:m>0?'var(--col-green)':m<0?'var(--col-red)':'var(--col-text-muted)'}}>
                  {modStr(v)}
                </div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* 경력 이력 */}
      {careers.length > 0 && (
        <div className="side-section">
          <div className="side-label">경력 이력</div>
          {careers.map((c,i)=>(
            <div key={i} style={{display:'flex',gap:'0.4rem',alignItems:'center',padding:'2px 0',borderBottom:'1px solid rgba(30,45,74,0.4)',fontSize:'0.72rem'}}>
              <span style={{color:'var(--col-text-dim)',fontFamily:'var(--font-mono)',minWidth:'16px'}}>{c.term}</span>
              <span style={{color:'var(--col-text)',flex:1}}>{c.careerId}</span>
              {c.rank>0&&<span style={{color:'var(--col-gold)',fontFamily:'var(--font-mono)',fontSize:'0.65rem'}}>직급{c.rank}</span>}
              <span style={{color:c.survived!==false?'var(--col-green)':'var(--col-red)',fontSize:'0.6rem'}}>
                {c.survived!==false?'✓':'✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 기능 */}
      {derived.sortedSkills.length > 0 && (
        <div className="side-section">
          <div className="side-label">기능 ({derived.sortedSkills.length})</div>
          <div style={{maxHeight:'180px',overflowY:'auto'}}>
            {derived.sortedSkills.map(({skill,level})=>(
              <div key={skill} style={{display:'flex',justifyContent:'space-between',padding:'1px 0',fontSize:'0.72rem',borderBottom:'1px solid rgba(30,45,74,0.3)'}}>
                <span style={{color:'var(--col-text)'}}>{skill}</span>
                <span style={{color:'var(--col-cyan)',fontFamily:'var(--font-mono)'}}>{level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 연줄 */}
      {contacts.length > 0 && (
        <div className="side-section">
          <div className="side-label">연줄 & 관계</div>
          {contacts.map(c=>(
            <div key={c.id} style={{display:'flex',gap:'0.4rem',alignItems:'center',fontSize:'0.72rem',padding:'2px 0'}}>
              <span style={{color:CONTACT_COLOR[c.type],minWidth:'40px',fontSize:'0.62rem',fontFamily:'var(--font-mono)'}}>{CONTACT_LABEL[c.type]}</span>
              <span style={{color:'var(--col-text-muted)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {c.description||`${c.careerId??'?'}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 재정 */}
      {(cash > 0 || benefits.length > 0) && (
        <div className="side-section">
          <div className="side-label">재정</div>
          {cash > 0 && (
            <div style={{fontFamily:'var(--font-mono)',fontSize:'0.8rem',color:'var(--col-gold)'}}>
              Cr {cash.toLocaleString()}
            </div>
          )}
          {benefits.map((b,i)=>(
            <div key={i} style={{fontSize:'0.7rem',color:'var(--col-text-muted)',padding:'1px 0'}}>{b}</div>
          ))}
        </div>
      )}

      {/* 현재 경력 */}
      {state.currentCareer && (
        <div className="side-section" style={{borderColor:'var(--col-gold-dim)'}}>
          <div className="side-label">현재 진행 중</div>
          <div style={{fontSize:'0.78rem',color:'var(--col-gold)'}}>
            {state.currentCareer} {state.currentSpecialty&&`/ ${state.currentSpecialty}`}
          </div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)'}}>
            {state.currentTerm}주기 {state.currentIsOfficer&&'· 장교'}
          </div>
        </div>
      )}
    </aside>
  )
}
