import { INSTRUMENT_BY_ID } from './instruments';
import type { InstrumentPart } from '../models/types';

export const PIANO_TIMBRES = [
  { id: 'standard', name: 'Acoustic Piano', nameZh: '一般原聲鋼琴', wording: 'piano' },
  { id: 'felt', name: 'Felt Piano', nameZh: '氈布柔音鋼琴 Felt Piano', wording: 'soft felt piano' },
] as const;

export function normalizePianoTimbre(instrumentId: string, value: unknown): 'felt' | undefined {
  return instrumentId === 'piano' && value === 'felt' ? 'felt' : undefined;
}

export function instrumentWording(part: Pick<InstrumentPart, 'instrumentId' | 'timbreId'>): string {
  return normalizePianoTimbre(part.instrumentId, part.timbreId) === 'felt'
    ? PIANO_TIMBRES[1].wording : INSTRUMENT_BY_ID.get(part.instrumentId)?.wording ?? '';
}

export function instrumentNameZh(part: Pick<InstrumentPart, 'instrumentId' | 'timbreId'>): string {
  return normalizePianoTimbre(part.instrumentId, part.timbreId) === 'felt'
    ? PIANO_TIMBRES[1].nameZh : INSTRUMENT_BY_ID.get(part.instrumentId)?.nameZh ?? '';
}
