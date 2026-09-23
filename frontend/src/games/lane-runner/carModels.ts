export const CAR_MODELS = ['sedan', 'hatch', 'sport', 'van', 'truck'] as const
export type CarModel = (typeof CAR_MODELS)[number]
