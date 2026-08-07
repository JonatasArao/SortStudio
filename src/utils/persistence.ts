import { get, set } from "idb-keyval";
import { Item, Result, CustomAudioItem, WheelConfig, AppSettings } from "../types";

export const WHEEL_KEY = "roleta_wheel";
export const SETTINGS_KEY = "roleta_settings";
export const AUDIOS_KEY = "roleta_audios";
export const RESULTS_KEY = "roleta_results";

export const saveWheelConfig = async (config: WheelConfig) => {
  await set(WHEEL_KEY, config);
};

export const getWheelConfig = async (): Promise<WheelConfig | undefined> => {
  return await get(WHEEL_KEY);
};

export const saveSettings = async (settings: AppSettings) => {
  await set(SETTINGS_KEY, settings);
};

export const getSettings = async (): Promise<AppSettings | undefined> => {
  return await get(SETTINGS_KEY);
};

export const saveAudios = async (audios: CustomAudioItem[]) => {
  await set(AUDIOS_KEY, audios);
};

export const getAudios = async (): Promise<CustomAudioItem[] | undefined> => {
  return await get(AUDIOS_KEY);
};

export const saveResults = async (results: Result[]) => {
  await set(RESULTS_KEY, results);
};

export const getResults = async (): Promise<Result[] | undefined> => {
  return await get(RESULTS_KEY);
};
export const SEASONS_KEY = "roleta_seasons";
export const saveSeasons = async (seasons: any[]) => {
  await set(SEASONS_KEY, seasons);
};
export const getSeasons = async (): Promise<any[] | undefined> => {
  return await get(SEASONS_KEY);
};
