export interface AiModel {
  id: string;
  label: string;
  badge: 'stable' | 'preview' | 'lite' | 'pro';
  supportsSearch: boolean;
  supportsVision: boolean;
}

export const AI_MODELS: AiModel[] = [
  { id: 'gemini-2.5-flash',              label: 'Gemini 2.5 Flash',       badge: 'stable',  supportsSearch: true,  supportsVision: true  },
  { id: 'gemini-2.5-pro',               label: 'Gemini 2.5 Pro',         badge: 'pro',     supportsSearch: true,  supportsVision: true  },
  { id: 'gemini-2.0-flash',             label: 'Gemini 2.0 Flash',       badge: 'stable',  supportsSearch: true,  supportsVision: false },
  { id: 'gemini-3-flash-preview',       label: 'Gemini 3 Flash',         badge: 'preview', supportsSearch: true,  supportsVision: false },
  { id: 'gemini-3.1-flash-lite-preview',label: 'Gemini 3.1 Flash Lite',  badge: 'lite',    supportsSearch: true,  supportsVision: false },
  { id: 'gemini-3.1-pro-preview',       label: 'Gemini 3.1 Pro',         badge: 'pro',     supportsSearch: true,  supportsVision: false },
];

// Default for text search; vision always uses gemini-2.5-flash
export const DEFAULT_AI_MODEL = 'gemini-2.5-flash';
export const VISION_MODEL = 'gemini-2.5-flash';

export const BADGE_COLORS: Record<AiModel['badge'], string> = {
  stable:  'bg-green-50  text-green-700  border-green-100',
  preview: 'bg-blue-50   text-blue-700   border-blue-100',
  lite:    'bg-gray-50   text-gray-600   border-gray-200',
  pro:     'bg-purple-50 text-purple-700 border-purple-100',
};
