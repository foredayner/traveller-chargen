// ─────────────────────────────────────────────────────────────
//  StepFinish.jsx — Step 6: 퇴직 소득 + 완전한 캐릭터 시트
// ─────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useCharacterContext } from '../../store/CharacterContext.jsx'
import careersData from '../../data/careersData.js'
import { DiceRollInline } from '../DiceAnimator.jsx'

const SPECIES_LIST = [
  {id:'human', name:'인간',  mods:{}, traits:''},
  {id:'aslan', name:'아슬란', mods:{str:+2,dex:-2}, traits:'며느리발톱(1D+2), 예리한 감각(경계/생존 +1)'},
  {id:'vargr', name:'바르그', mods:{str:-1,dex:+1,end:-1}, traits:'물기(1D+1), 예리한 감각(경계/생존 +1)'},
]

// ── 상수 ──────────────────────────────────────────────────────
const STAT_KEYS = ['str','dex','end','int','edu','soc']
const STAT_KO   = {str:'근력',dex:'민첩',end:'인내',int:'지능',edu:'교육',soc:'지위'}
const STAT_EN   = {str:'STR',dex:'DEX',end:'END',int:'INT',edu:'EDU',soc:'SOC'}
const MOD_T     = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3]
const mod       = v => MOD_T[Math.min(15,Math.max(0,v??0))]??0
const modStr    = v => { const m=mod(v); return m>=0?`+${m}`:`${m}` }

const CONTACT_INFO = {
  ally:    {label:'조력자', color:'var(--col-green)'},
  contact: {label:'연줄',   color:'var(--col-cyan)'},
  rival:   {label:'경쟁자', color:'var(--col-amber)'},
  enemy:   {label:'적수',   color:'var(--col-red)'},
}

// 기능 카테고리
const SKILL_TRAINING_PACKAGES = {
  '항공우주 기능 꾸러미': ['우주 비행','전자기기','의료','세상물정','중개','변호','외교','우주 항법'],
  '수사관 기능 꾸러미':   ['변호','행정','수사','설득','은신','세상물정','전자기기','기만','사격'],
  '우주선 기능 꾸러미':   ['우주 비행','포격','기계공학','정비','전자기기','의료','전술','우주 항법'],
  '범죄자 기능 꾸러미':   ['우주 비행','전자기기','은신','기만','설득','세상물정','중개','의료'],
}


// ── 캐릭터 시트 패널 (상세) ────────────────────────────────────
// ─── 캐릭터 시트 패널 (룰북 13p 기반) ───────────────────────
function CharacterSheetPanel({ state, actions, derived }) {
  const { stats, contacts, cash, benefits, careers, age, name, homeworld, pension } = state
  const [speciesId, setSpeciesId] = useState('human')
  const [weapons,   setWeapons]   = useState([{name:'',tl:'',range:'',dmg:'',attr:''}])
  const [equipment, setEquipment] = useState('')
  const [augments,  setAugments]  = useState('')
  const [notes,     setNotes]     = useState('')

  const specInfo = SPECIES_LIST.find(s => s.id === speciesId) ?? SPECIES_LIST[0]
  const uppStr   = STAT_KEYS.map(k => {
    const v = stats[k] ?? 0
    return v >= 10 ? String.fromCharCode(55 + v) : String(v)
  }).join('')

  const addWeapon = () => setWeapons(w => [...w, {name:'',tl:'',range:'',dmg:'',attr:''}])
  const setWField = (i, f, v) => setWeapons(w => w.map((wp, j) => j === i ? {...wp, [f]: v} : wp))

  return (
    <div>
      {/* ── 기본 정보 ── */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">기본 정보 <span className="card-title-en">TRAVELLER — UPP: {uppStr}</span></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
          <div>
            <label style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',marginBottom:'0.3rem'}}>이름</label>
            <input type="text" value={name} onChange={e=>actions.setName(e.target.value)} placeholder="이름을 입력하세요" />
          </div>
          <div>
            <label style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',marginBottom:'0.3rem'}}>고향 세계</label>
            <input type="text" value={homeworld} onChange={e=>actions.setHomeworld(e.target.value)} placeholder="고향 세계" />
          </div>
          <div>
            <label style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',marginBottom:'0.3rem'}}>종족</label>
            <select value={speciesId} onChange={e=>setSpeciesId(e.target.value)} style={{width:'100%',background:'var(--col-deep)',border:'1px solid var(--col-border)',borderRadius:'var(--radius-md)',padding:'0.5rem',color:'var(--col-text)',fontFamily:'var(--font-body)',fontSize:'0.9rem'}}>
              {SPECIES_LIST.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{display:'flex',gap:'1.5rem',fontFamily:'var(--font-mono)',fontSize:'0.78rem',color:'var(--col-text-muted)',flexWrap:'wrap'}}>
          <span>나이 <strong style={{color:'var(--col-cyan)'}}>{age}세</strong></span>
          <span>경력 <strong style={{color:'var(--col-cyan)'}}>{careers.length}주기</strong></span>
          <span>현금 <strong style={{color:'var(--col-gold)'}}>Cr {(cash??0).toLocaleString()}</strong></span>
          {(pension??0)>0 && <span>연금 <strong style={{color:'var(--col-green)'}}>Cr {pension.toLocaleString()}/월</strong></span>}
          {specInfo.traits && <span style={{color:'var(--col-cyan)',fontSize:'0.72rem'}}>종족 특성: {specInfo.traits}</span>}
        </div>
      </div>

      {/* ── 특성치 ── */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">특성치 <span className="card-title-en">CHARACTERISTICS — UPP {uppStr}</span></div>
        <div className="stat-grid">
          {STAT_KEYS.map(k => {
            const v = stats[k] ?? 0; const m = mod(v)
            const sm = specInfo.mods?.[k] ?? 0
            return (
              <div key={k} className="stat-card">
                <div className="stat-name">{STAT_EN[k]}</div>
                <div className="stat-value">{v}</div>
                <div className="stat-name" style={{marginTop:'2px'}}>{STAT_KO[k]}</div>
                <div className={`stat-mod ${m>0?'pos':m<0?'neg':''}`}>DM {modStr(v)}</div>
                {sm !== 0 && <div style={{fontSize:'0.55rem',color:sm>0?'var(--col-green)':'var(--col-red)',fontFamily:'var(--font-mono)'}}>종족 {sm>0?'+':''}{sm}</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 기능 + 연줄 ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
        <div className="card" style={{maxHeight:'300px',overflowY:'auto'}}>
          <div className="card-title">기능 <span className="card-title-en">SKILLS ({derived.sortedSkills.length})</span></div>
          {derived.sortedSkills.length === 0
            ? <p className="text-muted" style={{fontSize:'0.8rem'}}>없음</p>
            : <div className="skill-list">
                {derived.sortedSkills.map(({skill,level}) => (
                  <div key={skill} className="skill-row">
                    <span className="skill-name">{skill}</span>
                    <span className="skill-level">{level}</span>
                  </div>
                ))}
              </div>
          }
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
          <div className="card">
            <div className="card-title">연줄 & 관계 <span className="card-title-en">CONTACTS ({contacts.length})</span></div>
            {contacts.length === 0
              ? <p className="text-muted" style={{fontSize:'0.8rem'}}>없음</p>
              : <div className="skill-list">
                  {contacts.map(c => (
                    <div key={c.id} className="skill-row">
                      <span style={{color:CONTACT_INFO[c.type]?.color,fontFamily:'var(--font-mono)',fontSize:'0.65rem',minWidth:'44px'}}>{CONTACT_INFO[c.type]?.label}</span>
                      <span className="skill-name" style={{fontSize:'0.78rem'}}>{c.description || c.careerId || '?'}</span>
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
              {(benefits??[]).map((b,i) => (
                <div key={i} className="skill-row"><span className="skill-name" style={{fontSize:'0.78rem'}}>{b}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 장갑복 ── */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">장갑복 <span className="card-title-en">ARMOR</span></div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 0.5fr 0.5fr 0.5fr 2fr',gap:'0.4rem',marginBottom:'0.4rem'}}>
          {['유형','TL','장갑','피폭보호','부가 기능'].map(h=><span key={h} style={{color:'var(--col-text-muted)',fontFamily:'var(--font-mono)',fontSize:'0.62rem'}}>{h}</span>)}
        </div>
        {[0,1,2].map(i=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 0.5fr 0.5fr 0.5fr 2fr',gap:'0.4rem',marginBottom:'0.3rem'}}>
            <input type="text" placeholder="예: 직물" style={{fontSize:'0.78rem'}} />
            <input type="text" placeholder="7"     style={{fontSize:'0.78rem'}} />
            <input type="text" placeholder="+5"    style={{fontSize:'0.78rem'}} />
            <input type="text" placeholder="—"     style={{fontSize:'0.78rem'}} />
            <input type="text" placeholder="—"     style={{fontSize:'0.78rem'}} />
          </div>
        ))}
      </div>

      {/* ── 무기 ── */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">무기 <span className="card-title-en">WEAPONS</span></div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 0.5fr 1fr 1fr 1fr',gap:'0.4rem',marginBottom:'0.4rem'}}>
          {['무기명','TL','공격 거리','피해','속성'].map(h=><span key={h} style={{color:'var(--col-text-muted)',fontFamily:'var(--font-mono)',fontSize:'0.62rem'}}>{h}</span>)}
        </div>
        {weapons.map((w,i) => (
          <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 0.5fr 1fr 1fr 1fr',gap:'0.4rem',marginBottom:'0.3rem'}}>
            <input type="text" value={w.name}  placeholder="예: 도검"  onChange={e=>setWField(i,'name',e.target.value)}  style={{fontSize:'0.78rem'}} />
            <input type="text" value={w.tl}    placeholder="2"         onChange={e=>setWField(i,'tl',e.target.value)}    style={{fontSize:'0.78rem'}} />
            <input type="text" value={w.range} placeholder="근접"      onChange={e=>setWField(i,'range',e.target.value)} style={{fontSize:'0.78rem'}} />
            <input type="text" value={w.dmg}   placeholder="2D"        onChange={e=>setWField(i,'dmg',e.target.value)}   style={{fontSize:'0.78rem'}} />
            <input type="text" value={w.attr}  placeholder="—"         onChange={e=>setWField(i,'attr',e.target.value)}  style={{fontSize:'0.78rem'}} />
          </div>
        ))}
        <button className="btn btn-ghost" style={{fontSize:'0.72rem',marginTop:'0.5rem'}} onClick={addWeapon}>+ 무기 추가</button>
      </div>

      {/* ── 장비 & 개조 ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
        <div className="card">
          <div className="card-title">장비 <span className="card-title-en">EQUIPMENT</span></div>
          <textarea value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder="휴대용 통신기, 의료 키트..."
            style={{width:'100%',minHeight:'80px',background:'var(--col-deep)',border:'1px solid var(--col-border)',borderRadius:'var(--radius-md)',padding:'0.5rem',color:'var(--col-text)',fontFamily:'var(--font-body)',fontSize:'0.82rem',resize:'vertical',boxSizing:'border-box'}} />
        </div>
        <div className="card">
          <div className="card-title">개조 <span className="card-title-en">AUGMENTS</span></div>
          <textarea value={augments} onChange={e=>setAugments(e.target.value)} placeholder="사이버네틱스, 생체 이식물..."
            style={{width:'100%',minHeight:'80px',background:'var(--col-deep)',border:'1px solid var(--col-border)',borderRadius:'var(--radius-md)',padding:'0.5rem',color:'var(--col-text)',fontFamily:'var(--font-body)',fontSize:'0.82rem',resize:'vertical',boxSizing:'border-box'}} />
        </div>
      </div>

      {/* ── 학습 기간 ── */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">학습 기간 <span className="card-title-en">TRAINING PERIOD</span></div>
        <p style={{fontSize:'0.78rem',color:'var(--col-text-muted)',marginBottom:'0.5rem'}}>
          점프 1주 = 학습 1단위. 기능 0레벨: 1단위 필요. 레벨 향상: 목표 레벨 수만큼.
        </p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem'}}>
          <div><label style={{fontSize:'0.65rem',color:'var(--col-text-muted)',display:'block',marginBottom:'2px'}}>훈련 중인 기능</label><input type="text" placeholder="예: 우주 비행" style={{fontSize:'0.8rem'}} /></div>
          <div><label style={{fontSize:'0.65rem',color:'var(--col-text-muted)',display:'block',marginBottom:'2px'}}>훈련한 주</label><input type="number" placeholder="0" style={{fontSize:'0.8rem'}} /></div>
          <div><label style={{fontSize:'0.65rem',color:'var(--col-text-muted)',display:'block',marginBottom:'2px'}}>필요 단위</label><input type="number" placeholder="1" style={{fontSize:'0.8rem'}} /></div>
        </div>
      </div>

      {/* ── 경력 이력 ── */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">경력 이력 <span className="card-title-en">CAREER HISTORY</span></div>
        {careers.length === 0
          ? <p className="text-muted" style={{fontSize:'0.8rem'}}>경력 없음</p>
          : <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
              {careers.map((c,i) => {
                const cDef = careersData[c.careerId]
                const spDef = cDef?.specialties?.find(s => s.id === c.specialtyId)
                const rankList = cDef?.ranks?.[c.specialtyId] ?? cDef?.ranks?.enlisted ?? cDef?.ranks?.all ?? []
                const rankTitle = rankList.find(r => r.rank === (c.rank??0))?.title ?? ''
                return (
                  <div key={i} className="skill-row">
                    <span className="badge badge-muted" style={{marginRight:'0.4rem',flexShrink:0}}>{c.term}주기</span>
                    <span className="skill-name" style={{fontSize:'0.82rem',flex:1}}>
                      {cDef?.name ?? c.careerId}{spDef && ` / ${spDef.name}`}{c.isOfficer && ' (장교)'}
                      {rankTitle && rankTitle !== '-' && <span style={{color:'var(--col-gold)',marginLeft:'0.4rem',fontSize:'0.75rem',fontFamily:'var(--font-mono)'}}>{rankTitle}</span>}
                    </span>
                    <span style={{fontSize:'0.65rem',fontFamily:'var(--font-mono)',flexShrink:0,color:c.survived!==false?'var(--col-green)':'var(--col-red)'}}>{c.survived!==false?'생존':'사고'}</span>
                  </div>
                )
              })}
            </div>
        }
      </div>

      {/* ── 메모 ── */}
      <div className="card" style={{marginBottom:'1.5rem'}}>
        <div className="card-title">메모 <span className="card-title-en">NOTES</span></div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="여행자의 배경, 동기, 외모, 성격..."
          style={{width:'100%',minHeight:'80px',background:'var(--col-deep)',border:'1px solid var(--col-border)',borderRadius:'var(--radius-md)',padding:'0.5rem',color:'var(--col-text)',fontFamily:'var(--font-body)',fontSize:'0.82rem',resize:'vertical',boxSizing:'border-box'}} />
      </div>

      {/* ── 액션 ── */}
      <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end',flexWrap:'wrap'}}>
        <button className="btn btn-ghost" onClick={actions.exportJSON}>JSON 저장</button>
        <button className="btn btn-ghost" onClick={()=>window.print()}>인쇄 / PDF</button>
        <button className="btn btn-primary"
          onClick={()=>{ actions.finalize(); setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),100) }}
          disabled={!name} style={{minWidth:'120px'}}>
          {name ? '✓ 완성!' : '이름을 입력해주세요'}
        </button>
      </div>

      {state.isComplete && (
        <div style={{marginTop:'1.5rem',padding:'1.5rem',textAlign:'center',border:'2px solid var(--col-gold)',borderRadius:'var(--radius-lg)',background:'rgba(200,168,75,0.08)',boxShadow:'0 0 32px rgba(200,168,75,0.15)',animation:'panelFadeIn 0.4s ease'}}>
          <div style={{fontFamily:'var(--font-display)',fontSize:'1.4rem',color:'var(--col-gold)',marginBottom:'0.5rem',letterSpacing:'0.1em',textShadow:'0 0 20px rgba(200,168,75,0.5)'}}>
            ✦ 별들 사이로 — 모험을 찾아 떠납니다! ✦
          </div>
          <p style={{fontSize:'0.88rem',color:'var(--col-text)',marginBottom:'0.4rem'}}>
            <strong style={{color:'var(--col-gold)'}}>{name}</strong> 여행자의 캐릭터 생성이 완료됐습니다.
          </p>
          <p style={{fontSize:'0.78rem',color:'var(--col-text-muted)',marginBottom:'1.25rem'}}>
            나이 {age}세 · 경력 {careers.length}주기 · 현금 Cr {(cash??0).toLocaleString()}
          </p>
          <div style={{display:'flex',gap:'0.75rem',justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={actions.exportJSON}>💾 JSON 저장</button>
            <button className="btn btn-ghost" onClick={()=>window.print()}>🖨 인쇄 / PDF</button>
            <button className="btn btn-ghost" onClick={actions.resetCharacter}>↺ 새 여행자 만들기</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 학습 기간(훈련) 패널 ────────────────────────────────────
function TrainingPanel({ state, actions }) {
  const [targetSkill, setTargetSkill] = useState('')
  const [weeksSpent,  setWeeksSpent]  = useState(0)
  const [trainLog,    setTrainLog]    = useState([])
  const [pkgChoice,   setPkgChoice]   = useState('')

  // 최대 기능 합계: (지능 + 교육) × 3
  const maxSkillTotal = ((state.stats.int??0) + (state.stats.edu??0)) * 3
  const currentTotal  = Object.values(state.skills).reduce((s,v)=>s+Math.max(0,v),0)
  const atLimit       = currentTotal >= maxSkillTotal

  // 목표 레벨까지 필요한 학습 기간 수
  const currentLevel  = state.skills[targetSkill] ?? -1
  const targetLevel   = currentLevel + 1
  const weeksNeeded   = targetLevel <= 0 ? 1 : targetLevel // 레벨 0→1주, 1→1주, 2→2주, ...

  // 교육 판정 (8+)
  const doJudgment = () => {
    const roll = Math.floor(Math.random()*6)+1 + Math.floor(Math.random()*6)+1
    const eduMod = [-3,-2,-2,-1,-1,-1,0,0,0,1,1,1,2,2,2,3][Math.min(15,state.stats.edu??0)]
    const total = roll + eduMod
    const success = total >= 8
    if (success && targetSkill) {
      if (currentLevel < 0) {
        actions.applySkill(targetSkill, 0)
        setTrainLog(l=>[...l, `✓ ${targetSkill} 레벨 0 습득 (2D+교육DM=${total})`])
      } else {
        actions.applySkillDelta(targetSkill, 1)
        setTrainLog(l=>[...l, `✓ ${targetSkill} → 레벨 ${targetLevel} 향상 (2D+교육DM=${total})`])
      }
    } else {
      setTrainLog(l=>[...l, `✗ 판정 실패 (2D+교육DM=${total}, 목표 8+) — 다시 도전`])
    }
    setWeeksSpent(w=>w+weeksNeeded)
  }

  return (
    <div>
      {/* 한도 표시 */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">기능 학습 한도</div>
        <div style={{fontSize:'0.82rem',color:'var(--col-text-muted)',marginBottom:'0.5rem'}}>
          기능 레벨 총합 한도: (지능 {state.stats.int??0} + 교육 {state.stats.edu??0}) × 3 = <strong style={{color:'var(--col-gold)'}}>{maxSkillTotal}</strong>
        </div>
        <div style={{background:'var(--col-deep)',borderRadius:'var(--radius-md)',height:'8px',overflow:'hidden',marginBottom:'0.3rem'}}>
          <div style={{height:'100%',width:`${Math.min(100,currentTotal/maxSkillTotal*100)}%`,background:atLimit?'var(--col-red)':'var(--col-cyan)',transition:'width 0.3s'}} />
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:atLimit?'var(--col-red)':'var(--col-text-muted)'}}>
          현재 {currentTotal} / {maxSkillTotal} {atLimit&&'— 한도 초과! 새 기능은 레벨 0만 습득 가능'}
        </div>
      </div>

      {/* 학습 규칙 안내 */}
      <div className="card" style={{marginBottom:'1rem',background:'rgba(79,195,212,0.04)',borderColor:'var(--col-cyan-dim)'}}>
        <div className="card-title" style={{color:'var(--col-cyan)'}}>학습 기간 규칙</div>
        <ul style={{fontSize:'0.82rem',color:'var(--col-text-muted)',lineHeight:1.8,paddingLeft:'1rem'}}>
          <li>기능 레벨 0 습득: <strong style={{color:'var(--col-text)'}}>1주</strong> 소요, 교육 8+ 판정</li>
          <li>기능 레벨 향상: <strong style={{color:'var(--col-text)'}}>목표 레벨 수</strong>만큼의 주 소요 (예: 레벨2→3은 3주)</li>
          <li>운동 기능은 관련 신체 특성치로 판정</li>
          <li>다재다능 기능은 배울 수 없음</li>
          <li>점프 항해 동안 학습하는 것이 일반적</li>
        </ul>
      </div>

      {/* 기능 선택 + 판정 */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">기능 학습</div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'flex-end',flexWrap:'wrap',marginBottom:'1rem'}}>
          <div style={{flex:1,minWidth:'180px'}}>
            <label style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',letterSpacing:'0.1em',marginBottom:'0.3rem'}}>
              학습할 기능
            </label>
            <input type="text" value={targetSkill} onChange={e=>setTargetSkill(e.target.value)}
              placeholder="기능명 입력 (예: 우주 비행, 사격...)" list="skill-datalist" />
            <datalist id="skill-datalist">
              {Object.keys(state.skills).map(s=><option key={s} value={s}/>)}
            </datalist>
          </div>
          <div style={{minWidth:'120px'}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--col-text-muted)',marginBottom:'0.3rem'}}>
              현재 레벨: {state.skills[targetSkill]!==undefined ? state.skills[targetSkill] : '미보유'}
            </div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--col-cyan)'}}>
              필요 주수: {targetSkill ? (targetLevel<=0?1:targetLevel)+'주' : '—'}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" disabled={!targetSkill} onClick={doJudgment}>
          🎲 교육 8+ 판정 ({weeksNeeded}주 소요)
        </button>
        <div style={{marginTop:'0.5rem',fontFamily:'var(--font-mono)',fontSize:'0.7rem',color:'var(--col-text-muted)'}}>
          총 소요 주수: {weeksSpent}주
        </div>
      </div>

      {/* 기능 꾸러미 */}
      <div className="card" style={{marginBottom:'1rem'}}>
        <div className="card-title">기능 꾸러미 선택 <span className="card-title-en">SKILL PACKAGE</span></div>
        <p style={{fontSize:'0.82rem',color:'var(--col-text-muted)',marginBottom:'0.75rem'}}>
          모험 시작 전 일행과 함께 기능 꾸러미 하나를 선택합니다. 돌아가며 하나씩 기능을 선택합니다.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          {Object.entries(SKILL_TRAINING_PACKAGES).map(([pkg, skills])=>(
            <div key={pkg} style={{
              padding:'0.6rem 0.9rem',borderRadius:'var(--radius-md)',cursor:'pointer',
              border:`1px solid ${pkgChoice===pkg?'var(--col-gold)':'var(--col-border)'}`,
              background:pkgChoice===pkg?'rgba(200,168,75,0.07)':'var(--col-deep)',
            }} onClick={()=>setPkgChoice(pkg)}>
              <div style={{fontSize:'0.85rem',color:pkgChoice===pkg?'var(--col-gold)':'var(--col-text)',fontWeight:500,marginBottom:'0.3rem'}}>{pkg}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.25rem'}}>
                {skills.map(s=><span key={s} className="badge badge-muted" style={{fontSize:'0.62rem'}}>{s} 1</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 학습 로그 */}
      {trainLog.length > 0 && (
        <div className="card">
          <div className="card-title">학습 기록</div>
          {trainLog.map((l,i)=>(
            <div key={i} style={{fontSize:'0.78rem',padding:'3px 0',color:l.startsWith('✓')?'var(--col-green)':'var(--col-red)',fontFamily:'var(--font-mono)'}}>{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// D66 NPC 표 (룰북 86p)
// (이미 EventResolver에서 ally/rival 추가 시 무작위 생성 가능하도록 export)
export const NPC_TABLE = {
  11:'해군 장교',12:'제국 외교관',13:'파렴치한 상인',14:'의사',15:'괴짜 과학자',16:'용병',
  21:'유명 공연자',22:'외계인 도둑',23:'자유 무역상',24:'탐험가',25:'해병 대위',26:'기업 임원',
  31:'연구자',32:'문화 주재관',33:'종교계 지도자',34:'음모 가담자',35:'부유한 귀족',36:'인공지능',
  41:'따분해하는 귀족',42:'행성 총독',43:'도박 중독자',44:'사회 고발 중인 언론인',45:'종말론자 사교도',46:'기업 비밀 요원',
  51:'범죄 조직',52:'군정 장관',53:'육군 보급 장교',54:'사설탐정',55:'우주항 관리자',56:'퇴역한 제독',
  61:'외계 대사',62:'밀수업자',63:'무기 검사관',64:'나이 든 정치인',65:'행성 군벌 지도자',66:'제국 비밀 요원',
}

export function rollD66() {
  const d1 = Math.floor(Math.random()*6)+1
  const d2 = Math.floor(Math.random()*6)+1
  return { result: d1*10+d2, npc: NPC_TABLE[d1*10+d2] ?? '알 수 없는 인물' }
}

// ── 퇴직 소득 패널 ────────────────────────────────────────────
function MusterOutPanel({ state, actions, derived, totalRolls, remaining, onNext }) {
  const [rollType,  setRollType]  = useState(null)
  const [rollValue, setRollValue] = useState(null)
  const usedRolls  = (state.benefits?.length??0)+(state.cashRollsUsed??0)
  const lastCareer = state.careers.at(-1)
  const careerDef  = careersData[lastCareer?.careerId]
  const mustering  = careerDef?.mustering??{cash:[],benefits:[]}
  const hasGamble  = (state.skills?.['도박']??-1)>=1
  const maxRank    = state.careers.reduce((m,c)=>Math.max(m,c.rank??0),0)
  const rankDm     = maxRank>=5?1:0
  const allDone    = remaining<=0

  const applyRoll = () => {
    if (!rollType||!rollValue) return
    if (rollType==='cash') {
      const cashIdx = Math.min(6, rollValue+(hasGamble?1:0)+rankDm-1)
      actions.resolveMuster('cash', mustering.cash[cashIdx]??0)
    } else {
      const benefit = mustering.benefits[Math.min(6,rollValue+rankDm-1)]??'—'
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
            <div key={i} style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-mono)',fontSize:'0.65rem',border:`1.5px solid ${i<usedRolls?'var(--col-gold-dim)':i===usedRolls?'var(--col-gold)':'var(--col-border)'}`,background:i<usedRolls?'var(--col-gold-dim)':'var(--col-deep)',color:i<usedRolls?'var(--col-void)':i===usedRolls?'var(--col-gold)':'var(--col-text-dim)'}}>
              {i<usedRolls?'✓':i+1}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'1.5rem',fontFamily:'var(--font-mono)',fontSize:'0.78rem'}}>
          <div>
            <div style={{color:'var(--col-text-muted)',fontSize:'0.65rem'}}>현금</div>
            <div style={{color:'var(--col-gold)',fontSize:'1.1rem'}}>Cr {(state.cash??0).toLocaleString()}</div>
            <div style={{color:'var(--col-text-dim)',fontSize:'0.62rem'}}>현금 굴림 {state.cashRollsUsed??0}/3회</div>
          </div>
          <div style={{flex:1}}>
            <div style={{color:'var(--col-text-muted)',fontSize:'0.65rem',marginBottom:'0.25rem'}}>소득</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'0.3rem'}}>
              {(state.benefits??[]).length===0?<span style={{color:'var(--col-text-dim)'}}>없음</span>:(state.benefits??[]).map((b,i)=><span key={i} className="badge badge-cyan">{b}</span>)}
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
                현금 열 또는 소득 열을 선택합니다.{hasGamble&&<span style={{color:'var(--col-gold)'}}> 도박 기능 보유: 현금 +1.</span>}{rankDm>0&&<span style={{color:'var(--col-cyan)'}}> 직급 5+: 전 굴림 +1.</span>}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:'0.2rem 0.8rem',fontSize:'0.72rem',fontFamily:'var(--font-mono)',marginBottom:'0.75rem'}}>
                <span style={{color:'var(--col-text-dim)'}}>1D</span><span style={{color:'var(--col-text-muted)'}}>현금</span><span style={{color:'var(--col-text-muted)'}}>소득</span>
                {Array.from({length:7},(_,i)=>[
                  <span key={`n${i}`} style={{color:'var(--col-text-dim)'}}>{i+1}</span>,
                  <span key={`c${i}`} style={{color:'var(--col-text)'}}>Cr {(mustering.cash[Math.min(6,i+(hasGamble?1:0)+rankDm)]??0).toLocaleString()}</span>,
                  <span key={`b${i}`} style={{color:'var(--col-cyan)'}}>{mustering.benefits[Math.min(6,i+rankDm)]??'—'}</span>,
                ])}
              </div>
              <div className="choice-group">
                <button className="btn btn-primary" disabled={(state.cashRollsUsed??0)>=3} onClick={()=>setRollType('cash')}>현금 열{(state.cashRollsUsed??0)>=3?' (한도)':''}</button>
                <button className="btn btn-primary" onClick={()=>setRollType('benefit')}>소득 열</button>
              </div>
            </div>
          )}
          {rollType && !rollValue && (
            <div>
              <div style={{marginBottom:'0.5rem',fontSize:'0.82rem',color:'var(--col-text-muted)'}}>선택: <strong style={{color:'var(--col-gold)'}}>{rollType==='cash'?'현금 열':'소득 열'}</strong></div>
              <DiceRollInline label="소득 굴림 — 1D" count={1} sides={6} mod={0} onResult={({values})=>setTimeout(()=>setRollValue(values[0]),600)} />
              <button className="btn btn-ghost" style={{marginTop:'0.5rem',fontSize:'0.75rem'}} onClick={()=>setRollType(null)}>← 뒤로</button>
            </div>
          )}
          {rollType && rollValue && (
            <div>
              <div style={{padding:'0.75rem 1rem',border:`1.5px solid ${rollType==='cash'?'var(--col-gold)':'var(--col-cyan)'}`,borderRadius:'var(--radius-md)',background:rollType==='cash'?'rgba(200,168,75,0.07)':'rgba(79,195,212,0.07)',marginBottom:'0.75rem'}}>
                <div style={{fontFamily:'var(--font-mono)',fontSize:'0.65rem',color:'var(--col-text-muted)',marginBottom:'4px'}}>1D: {rollValue} — {rollType==='cash'?'현금 획득':'소득 획득'}</div>
                <div style={{fontSize:'1.1rem',fontWeight:500,color:rollType==='cash'?'var(--col-gold)':'var(--col-cyan)'}}>
                  {rollType==='cash'?`Cr ${(mustering.cash[Math.min(6,rollValue+(hasGamble?1:0)+rankDm-1)]??0).toLocaleString()}`:mustering.benefits[Math.min(6,rollValue+rankDm-1)]??'—'}
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
        <span style={{fontSize:'0.78rem',color:allDone?'var(--col-green)':'var(--col-text-muted)'}}>{allDone?'✓ 소득 정산 완료':`남은 굴림: ${remaining}회`}</span>
        <button className="btn btn-primary" onClick={onNext}>{allDone?'캐릭터 시트 →':'건너뛰고 시트로 →'}</button>
      </div>
    </div>
  )
}

// ── 메인 export ────────────────────────────────────────────────
export default function StepFinish() {
  const { state, actions, derived } = useCharacterContext()
  const [sub, setSub] = useState('muster')
  const totalRolls = derived.musterRolls
  const usedRolls  = (state.benefits?.length??0) + (state.cashRollsUsed??0)
  const remaining  = Math.max(0, totalRolls - usedRolls)
  const pension    = derived.pension  // 월 연금 (Cr)

  return (
    <div>
      <div className="step-heading">
        <h2>여행자 완성</h2>
        <p>{sub==='muster'?`퇴직 소득을 정산합니다. 총 ${totalRolls}회 굴릴 수 있습니다.`:'캐릭터 시트를 확인하고 저장합니다.'}</p>
        {pension > 0 && (
          <div style={{marginTop:'0.5rem',padding:'0.5rem 0.75rem',background:'rgba(78,205,196,0.07)',border:'1px solid rgba(78,205,196,0.3)',borderRadius:'var(--radius-md)',fontSize:'0.82rem',color:'var(--col-cyan)',display:'inline-flex',alignItems:'center',gap:'0.5rem'}}>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'0.7rem'}}>연금</span>
            <strong>Cr {pension.toLocaleString()} / 월</strong>
            <span style={{fontSize:'0.72rem',color:'var(--col-text-muted)'}}>
              (군/정찰 {state.careers.filter(c=>['army','navy','marine','scout'].includes(c.careerId)).length}주기)
            </span>
          </div>
        )}
      </div>
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1.5rem'}}>
        {[{key:'muster',label:'퇴직 소득',en:'MUSTERING OUT'},{key:'sheet',label:'캐릭터 시트',en:'CHARACTER SHEET'}].map(({key,label,en})=>(
          <button key={key} onClick={()=>setSub(key)} style={{padding:'0.5rem 1.2rem',fontFamily:'var(--font-body)',fontSize:'0.85rem',border:`1.5px solid ${sub===key?'var(--col-gold)':'var(--col-border)'}`,borderRadius:'var(--radius-md)',background:sub===key?'rgba(200,168,75,0.08)':'transparent',color:sub===key?'var(--col-gold)':'var(--col-text-muted)',cursor:'pointer',transition:'all 0.15s'}}>
            {label}<span style={{display:'block',fontFamily:'var(--font-mono)',fontSize:'0.6rem',letterSpacing:'0.1em',opacity:0.6,marginTop:'1px'}}>{en}</span>
          </button>
        ))}
      </div>
      {sub==='muster'&&<MusterOutPanel state={state} actions={actions} derived={derived} totalRolls={totalRolls} remaining={remaining} onNext={()=>setSub('sheet')} />}
      {sub==='sheet' &&<CharacterSheetPanel state={state} actions={actions} derived={derived} />}
    </div>
  )
}
