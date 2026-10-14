import { BTU_OPTIONS } from './constants';

const HP = { 6000: 0.6, 9000: 1, 12000: 1.5, 18000: 2, 24000: 2.5, 36000: 4 };
const BTU_PER_SQM = 600; // rule of thumb for PH rooms

export function recommendCapacity(sqm) {
  const needed = sqm * BTU_PER_SQM;
  const max = BTU_OPTIONS[BTU_OPTIONS.length - 1];
  const btu = BTU_OPTIONS.find((o) => o >= needed) || max;
  return { btu, hp: HP[btu], needsMultiple: needed > max };
}