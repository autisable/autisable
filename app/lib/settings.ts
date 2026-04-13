import { supabase } from "./supabase";

let settingsCache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (settingsCache && now - cacheTime < CACHE_TTL) {
    return settingsCache;
  }

  const { data } = await supabase
    .from("site_settings")
    .select("key, value");

  const map: Record<string, string> = {};
  if (data) {
    data.forEach((row) => {
      map[row.key] = row.value;
    });
  }

  settingsCache = map;
  cacheTime = now;
  return map;
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const settings = await getSettings();
  return settings[key] ?? fallback;
}
