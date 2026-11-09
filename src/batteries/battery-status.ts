/** Packs with SOC above this threshold are **available** when at a station (after charge). */
export const BATTERY_AVAILABLE_SOC_MIN_EXCLUSIVE = 80;

export const BATTERY_STATUS_VALUES = [
  'offline',
  'available',
  'charging',
  'in_use',
  'faulty',
] as const;

export type BatteryStatusValue = (typeof BATTERY_STATUS_VALUES)[number];

export function batteryStatusAtStation(soc: number): BatteryStatusValue {
  return soc > BATTERY_AVAILABLE_SOC_MIN_EXCLUSIVE ? 'available' : 'charging';
}
