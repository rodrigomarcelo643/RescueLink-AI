export const DISASTER_TYPES = [
  'flood',
  'fire',
  'earthquake',
  'landslide',
  'typhoon',
  'other',
] as const

export type DisasterType = (typeof DISASTER_TYPES)[number]
