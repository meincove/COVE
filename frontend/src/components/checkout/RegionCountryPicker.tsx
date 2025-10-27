"use client";

import * as React from "react";
import { Region, buildRegionOptions, EU_CODES } from "@/src/lib/geo/countries";

export type RegionCountryValue = {
  region: Region;
  country: string; // ISO-2
};

export function RegionCountryPicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: RegionCountryValue;
  onChange: (v: RegionCountryValue) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { region, country } = value;

  const countryOptions = React.useMemo(() => buildRegionOptions(region), [region]);

  // Keep country valid when region flips
  React.useEffect(() => {
    if (region === "EU" && !EU_CODES.includes(country as any)) {
      onChange({ region, country: "DE" });
    }
    if (region === "WORLD" && EU_CODES.includes(country as any)) {
      onChange({ region, country: "US" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  return (
    <div className={className}>
      <label htmlFor="region" className="block text-sm font-medium mb-1">Region</label>
      <select
        id="region"
        className="w-full rounded-lg border px-3 py-2 mb-3"
        value={region}
        onChange={(e) => onChange({ region: e.target.value as Region, country })}
        disabled={disabled}
      >
        <option value="EU">European Union (EU)</option>
        <option value="WORLD">Worldwide</option>
      </select>

      <label htmlFor="country" className="block text-sm font-medium mb-1">Shipping country</label>
      <select
        id="country"
        className="w-full rounded-lg border px-3 py-2"
        value={country}
        onChange={(e) => onChange({ region, country: e.target.value })}
        disabled={disabled}
      >
        {countryOptions.map(({ code, name }) => (
          <option key={code} value={code}>
            {name} ({code})
          </option>
        ))}
      </select>
    </div>
  );
}
