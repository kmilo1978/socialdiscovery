// Google geolocation codes.
// `gl` = geolocation (ISO 3166-1 alpha-2), `hl` = host language.
// DuckDuckGo uses `kl` (region code like us-en, co-es).
// When set, the search engine returns results as if the user is in that country.

export interface GeoLocation {
  label: string;
  gl: string; // Google gl param (ISO code)
  kl: string; // DuckDuckGo kl param
  hl?: string; // Language hint
}

export const GEOLOCATIONS: GeoLocation[] = [
  { label: "Global (No region)", gl: "", kl: "wt-wt", hl: "en" },
  // --- Major markets ---
  { label: "🇺🇸 United States", gl: "us", kl: "us-en", hl: "en" },
  { label: "🇬🇧 United Kingdom", gl: "uk", kl: "uk-en", hl: "en" },
  { label: "🇨🇦 Canada", gl: "ca", kl: "ca-en", hl: "en" },
  { label: "🇦🇺 Australia", gl: "au", kl: "au-en", hl: "en" },
  { label: "🇮🇳 India", gl: "in", kl: "in-en", hl: "en" },
  { label: "🇩🇪 Germany", gl: "de", kl: "de-de", hl: "de" },
  { label: "🇫🇷 France", gl: "fr", kl: "fr-fr", hl: "fr" },
  { label: "🇪🇸 Spain", gl: "es", kl: "es-es", hl: "es" },
  { label: "🇯🇵 Japan", gl: "jp", kl: "jp-jp", hl: "ja" },
  { label: "🇧🇷 Brazil", gl: "br", kl: "br-pt", hl: "pt" },
  // --- Latin America ---
  { label: "🇲🇽 Mexico", gl: "mx", kl: "mx-es", hl: "es" },
  { label: "🇨🇴 Colombia", gl: "co", kl: "co-es", hl: "es" },
  { label: "🇦🇷 Argentina", gl: "ar", kl: "ar-es", hl: "es" },
  { label: "🇨🇱 Chile", gl: "cl", kl: "cl-es", hl: "es" },
  { label: "🇵🇪 Peru", gl: "pe", kl: "pe-es", hl: "es" },
  { label: "🇪🇨 Ecuador", gl: "ec", kl: "ec-es", hl: "es" },
  { label: "🇻🇪 Venezuela", gl: "ve", kl: "ve-es", hl: "es" },
  { label: "🇺🇾 Uruguay", gl: "uy", kl: "uy-es", hl: "es" },
  { label: "🇵🇦 Panama", gl: "pa", kl: "pa-es", hl: "es" },
  { label: "🇨🇷 Costa Rica", gl: "cr", kl: "cr-es", hl: "es" },
  { label: "🇩🇴 Dominican Republic", gl: "do", kl: "do-es", hl: "es" },
  { label: "🇬🇹 Guatemala", gl: "gt", kl: "gt-es", hl: "es" },
  { label: "🇭🇳 Honduras", gl: "hn", kl: "hn-es", hl: "es" },
  { label: "🇧🇴 Bolivia", gl: "bo", kl: "bo-es", hl: "es" },
  { label: "🇵🇾 Paraguay", gl: "py", kl: "py-es", hl: "es" },
  { label: "🇸🇻 El Salvador", gl: "sv", kl: "sv-es", hl: "es" },
  { label: "🇳🇮 Nicaragua", gl: "ni", kl: "ni-es", hl: "es" },
  { label: "🇵🇷 Puerto Rico", gl: "pr", kl: "pr-es", hl: "es" },
];

/** Get a GeoLocation by its gl code. Returns global (no region) if not found. */
export function getGeoByGl(gl: string): GeoLocation {
  return GEOLOCATIONS.find((g) => g.gl === gl) || GEOLOCATIONS[0];
}
