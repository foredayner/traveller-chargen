// ─────────────────────────────────────────────────────────────
//  StepFinish.jsx — Step 6: 소득 정산 + 캐릭터 완성
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import careersData from '../../data/careersData.js'
import { DiceRollInline } from '../DiceAnimator.jsx'

const STAT_KEYS = ['str','dex','end','int','edu','soc']
const STAT_KO = {str:'근력',dex:'민첩',end:'인내',int:'지능',edu:'교육',soc:'지위'}
const STAT_EN = {str:'STR',dex:'DEX',end:'END',int:'INT',edu:'EDU',soc:'SOC'}
const CONTACT_INFO = {
  ally:   {label:'조력자',color:'var(--col-green)'},
  contact:{label:'연줄',  color:'var(--col-cyan)' },
  rival:  {label:'경쟁자',color:'var(--col-amber)'},
  enemy:  {label:'적수',  color:'var(--col-red)'  },
}
const MOD_TABLE = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]
function mod(v) { return MOD_TABLE[Math.min(15,Math.max(0,v??0))]??0 }
function modStr(v){ const m=mod(v); return m>0?`+${m}`:`${m}` }

export default function StepFinish() {
  const { state, actions, derived } = useCharacterContext()
  const [subStep, setSubStep] = useState('muster')
  const totalRolls = derived.musterRolls
  const usedRolls  = (state.benefits?.length ?? 0) + (state.cashRollsUsed ?? 0)
  const remaining  = Math.max(0, totalRolls - usedRolls)

  return (
    <div>
      <div className="step-heading">
        <h2>여행자 완성</h2>
        <p>{subStep==='muster'
          ? `경력을 마무리하고 퇴직 소득을 정산합니다. 총 ${totalRolls}회 굴릴 수 있습니다.`
          : '캐릭터 시트를 확인하고 저장합니다.'}</p>
      </div>

      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
        {[{key:'muster',label:'퇴직 소득',en:'MUSTERING OUT'},{key:'sheet',label:'캐릭터 시트',en:'CHARACTER SHEET'}].map(({key,label,en})=>(
          <button key={key} onClick={()=>setSubStep(key)} style={{
            padding:'0.5rem 1.2rem',fontFamily:'var(--font-body)',fontSize:'0.85rem',
            border:`1.5px solid ${subStep===key?'var(--col-gold)':'var(--col-border)'}`,
            borderRadius:'var(--radius-md)',
            background:subStep===key?'rgba(200,168,75,0.08)':'transparent',
            color:subStep===key?'var(--col-gold)':'var(--col-text-muted)',cursor:'pointer',transition:'all 0.15s',
          }}>
            {label}
            <span style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.6rem',letterSpacing:'0.1em',opacity:0.6,marginTop:'1px'}}>{en}</span>
          </button>
        ))}
      </div>

      {subStep==='muster' && <MusterOutPanel state={state} actions={actions} derived={derived} totalRolls={totalRolls} remaining={remaining} onNext={()=>setSubStep('sheet')} />}
      {subStep==='sheet'  && <CharacterSheetPanel state={state} actions={actions} derived={derived} />}
    </div>
  )
}

function MusterOutPanel({ state, actions, derived, totalRolls, remaining, onNext }) {
  const [rollType,   setRollType]   = useState(null)
  const [rollValue,  setRollValue]  = useState(null)
  const usedRolls  = (state.benefits?.length??0) + (state.cashRollsUsed??0)
  const lastCareer = state.careers.at(-1)
  const careerDef  = careersData[lastCareer?.careerId]
  const mustering  = careerDef?.mustering ?? {cash:[],benefits:[]}
  const hasGamble  = (state.skills?.['도박']??-1)>=1
  const maxRank    = state.careers.reduce((m,c)=>Math.max(m,c.rank??0),0)
  const rankDm     = maxRank>=5?1:0
  const allDone    = remaining<=0

  const applyRoll = () => {
    if (!rollType||!rollValue) return
    const adjIdx = Math.min(6, rollValue + rankDm - 1)
    if (rollType==='cash') {
      const cashIdx = Math.min(6, rollValue+(hasGamble?1:0)+rankDm-1)
      const cashAmt = mustering.cash[cashIdx]??0
      actions.resolveMuster('cash', cashAmt)
    } else {
      const benefit = mustering.benefits[adjIdx]??'—'
      const m = benefit.match(/(str|dex|end|int|edu|soc)\+(\d+)/i)
      if (m) actions.applyStatChange(m[1].toLowerCase(), parseInt(m[2]))
      actions.resolveMuster('benefit', benefit)
    }
    setRollType(null); setRollValue(null)
  }

  return (
    <div>
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">소득 현황 <span className="card-title-en">MUSTERING OUT — {usedRolls}/{totalRolls}</span></div>
        <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap',marginBottom:'0.75rem'}}>
          {Array.from({length:totalRolls},(_,i)=>(
            <div key={i} style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-mono)',fontSize:'0.65rem',
              border:`1.5px solid ${i<usedRolls?'var(--col-gold-dim)':i===usedRolls?'var(--col-gold)':'var(--col-border)'}`,
              background:i<usedRolls?'var(--col-gold-dim)':'var(--col-deep)',
              color:i<usedRolls?'var(--col-void)':i===usedRolls?'var(--col-gold)':'var(--col-text-dim)'}}>
              {i<usedRolls?'✓':i+1}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'1.5rem',fontFamily:'var(--font-mono)',fontSize:'0.78rem'}}>
          <div>
            <div style={{color:'var(--col-text-muted)',fontSize:'0.65rem',letterSpacing:'0.1em'}}>현금</div>
            <div style={{color:'var(--col-gold)',fontSize:'1.1rem'}}>Cr {(state.cash??0).toLocaleString()}</div>
            <div style={{color:'var(--col-text-dim)',fontSize:'0.62rem'}}>현금 굴림 {state.cashRollsUsed??0}/3회</div>
          </div>
          <div style={{flex:1}}>
            <div style={{color:'var(--col-text-muted)',fontSize:'0.65rem',letterSpacing:'0.1em',marginBottom:'0.25rem'}}>소득</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'0.3rem'}}>
              {(state.benefits??[]).length===0
                ?<span style={{color:'var(--col-text-dim)'}}>없음</span>
                :(state.benefits??[]).map((b,i)=><span key={i} className="badge badge-cyan">{b}</span>)
              }
            </div>
          </div>
        </div>
      </div>

      {!allDone && (
        <div className="card" style={{marginBottom:'1rem'}}>
          <div className="card-title">{usedRolls+1}번째 소득 굴림 — {careerDef?.name??'?'} 퇴직 소득 표</div>

          {!rollType && (
            <div>
              <p className="text-muted" style={{fontSize:'0.82rem',marginBottom:'0.75rem'}}>
                현금 또는 소득 열을 선택합니다. 현금은 전체 최대 3회입니다.
                {hasGamble&&<span style={{color:'var(--col-gold)'}}> 도박 기능: 현금 표 +1.</span>}
                {rankDm>0&&<span style={{color:'var(--col-cyan)'}}> 직급 5+: 전 굴림 +1.</span>}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:'0.2rem 0.8rem',fontSize:'0.72rem',fontFamily:'var(--font-mono)',marginBottom:'0.75rem'}}>
                <span style={{color:'var(--col-text-dim)'}}>1D</span>
                <span style={{color:'var(--col-text-muted)'}}>현금</span>
                <span style={{color:'var(--col-text-muted)'}}>소득</span>
                {Array.from({length:7},(_,i)=>[
                  <span key={`n${i}`} style={{color:'var(--col-text-dim)'}}>{i+1}</span>,
                  <span key={`c${i}`} style={{color:'var(--col-text)'}}>Cr {(mustering.cash[Math.min(6,i+(hasGamble?1:0)+rankDm)]??0).toLocaleString()}</span>,
                  <span key={`b${i}`} style={{color:'var(--col-cyan)'}}>{mustering.benefits[Math.min(6,i+rankDm)]??'—'}</span>,
                ])}
              </div>
              <div className="choice-group">
                <button className="btn btn-primary" disabled={(state.cashRollsUsed??0)>=3} onClick={()=>setRollType('cash')}>
                  현금 열{(state.cashRollsUsed??0)>=3?' (한도)':''}
                </button>
                <button className="btn btn-primary" onClick={()=>setRollType('benefit')}>소득 열</button>
              </div>
            </div>
          )}

          {rollType && !rollValue && (
            <div>
              <div style={{marginBottom:'0.5rem',fontSize:'0.82rem',color:'var(--col-text-muted'}}>
                선택: <strong style={{color:'var(--col-gold)'}}>{rollType==='cash'?'현금 열':'소득 열'}</strong>
              </div>
              <DiceRollInline label={`소득 굴림 — 1D`} count={1} sides={6} mod={0}
                onResult={({values})=>setTimeout(()=>setRollValue(values[0]),600)} />
              <button className="btn btn-ghost" style={{marginTop:'0.5rem',fontSize:'0.75rem'}} onClick={()=>setRollType(null)}>← 뒤로</button>
            </div>
          )}

          {rollType && rollValue && (
            <div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.72rem',color:'var(--col-text-muted)',marginBottom:'0.5rem'}}>1D: {rollValue}</div>
              <div style={{padding:'0.75rem 1rem',border:`1.5px solid ${rollType==='cash'?'var(--col-gold)':'var(--col-cyan)'}`,borderRadius:'var(--radius-md)',background:rollType==='cash'?'rgba(200,168,75,0.07)':'rgba(79,195,212,0.07)',marginBottom:'0.75rem'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',marginBottom:'4px'}}>{rollType==='cash'?'현금 획득':'소득 획득'}</div>
                <div style={{fontSize:'1.1rem',fontWeight:500,color:rollType==='cash'?'var(--col-gold)':'var(--col-cyan)'}}>
                  {rollType==='cash'
                    ?`Cr ${(mustering.cash[Math.min(6,rollValue+(hasGamble?1:0)+rankDm-1)]??0).toLocaleString()}`
                    :mustering.benefits[Math.min(6,rollValue+rankDm-1)]??'—'
                  }
                </div>
              </div>
              <div className="choice-group">
                <button className="btn btn-primary" onClick={applyRoll}>적용 →</button>
                <button className="btn btn-ghost" style={{fontSize:'0.75rem'}} onClick={()=>setRollValue(null)}>다시 굴리기</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'0.5rem'}}>
        <span style={{fontSize:'0.78rem',color:allDone?'var(--col-green)':'var(--col-text-muted)'}}>
          {allDone?'✓ 소득 정산 완료':`남은 굴림: ${remaining}회`}
        </span>
        <button className="btn btn-primary" onClick={onNext}>
          {allDone?'캐릭터 시트 →':'건너뛰고 시트로 →'}
        </button>
      </div>
    </div>
  )
}

function CharacterSheetPanel({ state, actions, derived }) {
  const { stats, skills, contacts, cash, benefits, careers, age, name, homeworld, pension } = state
  return (
    <div>
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">기본 정보 <span className="card-title-en">TRAVELLER</span></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'0.75rem'}}>
          <div>
            <label style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',letterSpacing:'0.1em',marginBottom:'0.3rem'}}>여행자 이름</label>
            <input type="text" value={name} onChange={e=>actions.setName(e.target.value)} placeholder="이름을 입력하세요" style={{fontFamily:'var(--font-display)',fontSize:'1rem'}} />
          </div>
          <div>
            <label style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',letterSpacing:'0.1em',marginBottom:'0.3rem'}}>고향 세계</label>
            <input type="text" value={homeworld} onChange={e=>actions.setHomeworld(e.target.value)} placeholder="고향 세계 이름" />
          </div>
        </div>
        <div style={{display:'flex',gap:'1.5rem',fontFamily:'var(--font-mono)',fontSize:'0.78rem',color:'var(--col-text-muted)',flexWrap:'wrap'}}>
          <span>나이 <strong style={{color:'var(--col-cyan)'}}>{age}세</strong></span>
          <span>경력 주기 <strong style={{color:'var(--col-cyan)'}}>{careers.length}회</strong></span>
          <span>현금 <strong style={{color:'var(--col-gold)'}}>Cr {(cash??0).toLocaleString()}</strong></span>
          {(pension??0)>0&&<span>연금 <strong style={{color:'var(--col-green)'}}>Cr {pension.toLocaleString()}/월</strong></span>}
        </div>
      </div>

      <div className="stat-grid" style={{marginBottom:'1rem'}}>
        {STAT_KEYS.map(k=>{
          const v=stats[k]??0; const m=mod(v)
          return (
            <div key={k} className="stat-card">
              <div className="stat-name">{STAT_EN[k]}</div>
              <div className="stat-value">{v}</div>
              <div className="stat-name" style={{marginTop:'2px'}}>{STAT_KO[k]}</div>
              <div className={`stat-mod ${m>0?'pos':m<0?'neg':''}`}>DM {modStr(v)}</div>
            </div>
          )
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
        <div className="card" style={{maxHeight:'340px',overflowY:'auto'}}>
          <div className="card-title">기능 <span className="card-title-en">SKILLS ({derived.sortedSkills.length})</span></div>
          {derived.sortedSkills.length===0
            ?<p className="text-muted" style={{fontSize:'0.8rem'}}>아직 기능 없음</p>
            :<div className="skill-list">
              {derived.sortedSkills.map(({skill,level})=>(
                <div key={skill} className="skill-row">
                  <span className="skill-name">{skill}</span>
                  <span className="skill-level">{level}</span>
                </div>
              ))}
            </div>
          }
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="card">
            <div className="card-title">연줄 & 관계 <span className="card-title-en">CONTACTS ({contacts.length})</span></div>
            {contacts.length===0
              ?<p className="text-muted" style={{fontSize:'0.8rem'}}>연줄 없음</p>
              :<div className="skill-list">
                {contacts.map(c=>(
                  <div key={c.id} className="skill-row">
                    <span style={{color:CONTACT_INFO[c.type]?.color??'var(--col-text-muted)',fontFamily:'var(--font-mono)',fontSize:'0.65rem',minWidth:'44px'}}>
                      {CONTACT_INFO[c.type]?.label??c.type}
                    </span>
                    <span className="skill-name" style={{fontSize:'0.78rem'}}>
                      {c.description||`${c.careerId??'?'} ${c.term??''}주기`}
                    </span>
                  </div>
                ))}
              </div>
            }
          </div>
          <div className="card">
            <div className="card-title">재정 <span className="card-title-en">FINANCES</span></div>
            <div className="skill-list">
              <div className="skill-row">
                <span className="skill-name">현금</span>
                <span className="skill-level" style={{color:'var(--col-gold)'}}>Cr {(cash??0).toLocaleString()}</span>
              </div>
              {(benefits??[]).map((b,i)=>(
                <div key={i} className="skill-row">
                  <span className="skill-name" style={{fontSize:'0.78rem'}}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">경력 이력 <span className="card-title-en">CAREER HISTORY</span></div>
        {careers.length===0
          ?<p className="text-muted" style={{fontSize:'0.8rem'}}>경력 없음</p>
          :<div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
            {careers.map((c,i)=>{
              const cDef=careersData[c.careerId]; const spDef=cDef?.specialties?.find(s=>s.id===c.specialtyId)
              const rankList=cDef?.ranks?.[c.specialtyId]??cDef?.ranks?.enlisted??cDef?.ranks?.all??[]
              const rankTitle=rankList.find(r=>r.rank===(c.rank??0))?.title??''
              return (
                <div key={i} className="skill-row">
                  <span className="badge badge-muted" style={{marginRight:'0.4rem',flexShrink:0}}>{c.term}주기</span>
                  <span className="skill-name" style={{fontSize:'0.82rem',flex:1}}>
                    {cDef?.name??c.careerId}{spDef&&` / ${spDef.name}`}{c.isOfficer&&' (장교)'}
                    {rankTitle&&rankTitle!=='-'&&<span style={{color:'var(--col-gold)',marginLeft:'0.4rem',fontSize:'0.75rem',fontFamily:'var(--font-mono)'}}>{rankTitle}</span>}
                  </span>
                  <span style={{fontSize:'0.65rem',fontFamily:'var(--font-mono)',flexShrink:0,color:c.survived!==false?'var(--col-green)':'var(--col-red)'}}>
                    {c.survived!==false?'생존':'사고'}
                  </span>
                </div>
              )
            })}
          </div>
        }
      </div>

      <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',alignItems:'center',flexWrap:'wrap'}}>
        <button className="btn btn-ghost" onClick={actions.exportJSON}>JSON 저장</button>
        <button className="btn btn-ghost" onClick={()=>window.print()}>인쇄 / PDF</button>
        <button className="btn btn-primary" onClick={actions.finalize} disabled={!name} style={{minWidth:'120px'}}>
          {name?'✓ 완성!':'이름을 입력해주세요'}
        </button>
      </div>

      {state.isComplete&&(
        <div style={{marginTop:'1.5rem',padding:'1rem',textAlign:'center',border:'1px solid var(--col-gold)',borderRadius:'var(--radius-lg)',background:'rgba(200,168,75,0.06)'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',color:'var(--col-gold)',marginBottom:'0.5rem',letterSpacing:'0.1em'}}>
            별들 사이로 — 모험을 찾아 떠납니다!
          </div>
          <p style={{fontSize:'0.82rem',color:'var(--col-text-muted)',marginBottom:'1rem'}}>{name} 여행자의 캐릭터 생성이 완료됐습니다.</p>
          <button className="btn btn-ghost" onClick={actions.resetCharacter}>↺ 새 여행자 만들기</button>
        </div>
      )}
    </div>
  )
}
