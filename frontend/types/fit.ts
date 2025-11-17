export type SizeChartMeasurements = {
  chest?: number
  length?: number
  shoulder?: number
  sleeve?: number
  waist?: number
  hip?: number
  thigh?: number
  inseam?: number
}

export type SizeChartEntry = {
  key: string
  type: string
  gender: string
  fit: string
  unit: "cm"
  measurements: {
    [size: string]: SizeChartMeasurements
  }
  notes?: string
}

export type FitRule = {
  heightRangeCm: [number, number]
  weightRangeKg: [number, number]
  build?: string[]
  preferredFit?: string
  recommendedSize: string
  altSizeIfOversized?: string
  notes?: string
}

export type FitRuleSet = {
  key: string
  type: string
  gender: string
  fit: string
  rules: FitRule[]
}
