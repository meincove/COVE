// src/lib/geo/countries.ts

// EU-27 ISO-2
export const EU_CODES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
] as const;
export type EUCode = (typeof EU_CODES)[number];

// Wide world list (includes EU too; UI filters duplicates)
export const WORLD_CODES = [
  "AF","AX","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BQ","BA","BW","BV","BR","IO","BN","BG","BF","BI","CV","KH","CM","CA","KY","CF","TD","CL","CN","CX","CC","CO","KM","CG","CD","CK","CR","CI","HR","CU","CW","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FK","FO","FJ","FI","FR","GF","PF","TF","GA","GM","GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GG","GN","GW","GY","HT","HM","VA","HN","HK","HU","IS","IN","ID","IR","IQ","IE","IM","IL","IT","JM","JP","JE","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MO","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM","NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MK","MP","NO","OM","PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR","QA","RE","RO","RU","RW","BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","GS","SS","ES","LK","SD","SR","SJ","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","US","UM","UY","UZ","VU","VE","VN","VG","VI","WF","EH","YE","ZM","ZW",
] as const;

export type WorldCode = (typeof WORLD_CODES)[number];
export type Region = "EU" | "WORLD";

const display = typeof Intl !== "undefined" && (Intl as any).DisplayNames
  ? new (Intl as any).DisplayNames([typeof navigator !== "undefined" ? navigator.language : "en"], { type: "region" })
  : null;

export function nameOfCountry(code: string): string {
  try {
    const n = display?.of(code);
    if (n && typeof n === "string") return n;
  } catch {}
  return code;
}

export function buildRegionOptions(region: Region) {
  const eu = EU_CODES.map(c => ({ code: c, name: nameOfCountry(c) }))
                     .sort((a,b) => a.name.localeCompare(b.name));
  if (region === "EU") return eu;

  // WORLD minus EU duplicates
  const world = Array.from(new Set(WORLD_CODES as readonly string[]))
    .filter(c => !EU_CODES.includes(c as any))
    .map(c => ({ code: c, name: nameOfCountry(c) }))
    .sort((a,b) => a.name.localeCompare(b.name));
  return world;
}
