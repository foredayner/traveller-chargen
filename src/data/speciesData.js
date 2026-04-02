// ─────────────────────────────────────────────────────────────
//  speciesData.js — 종족 데이터 (룰북 p.50~51)
// ─────────────────────────────────────────────────────────────

export const SPECIES = {
  human: {
    id: 'human', name: '인간', nameEn: 'Human',
    statMods: {},
    traits: [],
    desc: '서드 임페리움의 지배적인 종족입니다.',
  },
  aslan: {
    id: 'aslan', name: '아슬란', nameEn: 'Aslan',
    statMods: { str: +2, dex: -2 },
    traits: ['며느리발톱 (근접전(생체) 1D+2)', '예리한 감각 (경계·생존 +1)'],
    desc: '경쟁하는 부족들과 포식자 전사들로 이루어진 팽창주의자 종족입니다.',
  },
  vargr: {
    id: 'vargr', name: '바르그', nameEn: 'Vargr',
    statMods: { str: -1, dex: +1, end: -1 },
    traits: ['물기 (근접전(생체) 1D+1)', '예리한 감각 (경계·생존 +1)', '야간 시력 열등 (어둠 속 -1)'],
    desc: '고대인들에게 직접적인 도움을 받은 유일한 종족입니다.',
  },
}

export const SPECIES_LIST = Object.values(SPECIES)

// 공용 특성 지표(UPP) 16진수 변환
export function toHex(v) {
  if (v >= 10) return String.fromCharCode(55 + v) // A=65-10=55
  return String(v)
}

export function getUPP(stats) {
  const keys = ['str','dex','end','int','edu','soc']
  return keys.map(k => toHex(stats[k] ?? 0)).join('')
}
