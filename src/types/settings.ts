export interface AppSettings {
  openaiApiKey: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: null,
};
