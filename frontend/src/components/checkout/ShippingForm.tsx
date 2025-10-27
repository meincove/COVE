// src/components/checkout/ShippingForm.tsx
"use client";

import * as React from "react";
// NOTE: types folder is outside src → use a relative import from this file's depth.
// Adjust the ../../../ if your folder depth differs.
import type { ShippingAddress } from "../../../types/checkout";

type Props = {
  value: Partial<ShippingAddress>;
  onChange: (patch: Partial<ShippingAddress>) => void;
  disabled?: boolean;
  required?: boolean;
  countries?: { code: string; label: string }[]; // defaults to DE only
};

export default function ShippingForm({
  value,
  onChange,
  disabled = false,
  required = true,
  countries = [{ code: "DE", label: "Germany" }],
}: Props) {
  const v = value || {};

  const set = (key: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ [key]: e.target.value });

  return (
    <fieldset className="space-y-4 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium text-gray-800">Shipping Address</legend>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-700">Full name</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
            placeholder="e.g. Jane Doe"
            value={v.shipping_name || ""}
            onChange={set("shipping_name")}
            disabled={disabled}
            required={required}
            autoComplete="name"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-700">Address line 1</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
            placeholder="Street, house number"
            value={v.shipping_address_line1 || ""}
            onChange={set("shipping_address_line1")}
            disabled={disabled}
            required={required}
            autoComplete="address-line1"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm text-gray-700">Address line 2 (optional)</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
            placeholder="Apartment, suite, etc."
            value={v.shipping_address_line2 || ""}
            onChange={set("shipping_address_line2")}
            disabled={disabled}
            autoComplete="address-line2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700">City</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
            value={v.shipping_city || ""}
            onChange={set("shipping_city")}
            disabled={disabled}
            required={required}
            autoComplete="address-level2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700">State / Province</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
            value={v.shipping_state || ""}
            onChange={set("shipping_state")}
            disabled={disabled}
            autoComplete="address-level1"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700">Postal code</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black"
            value={v.shipping_postal_code || ""}
            onChange={set("shipping_postal_code")}
            disabled={disabled}
            required={required}
            autoComplete="postal-code"
            inputMode="numeric"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700">Country</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black bg-white"
            value={v.shipping_country || (countries[0]?.code ?? "")}
            onChange={set("shipping_country")}
            disabled={disabled}
            required={required}
            autoComplete="country"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
