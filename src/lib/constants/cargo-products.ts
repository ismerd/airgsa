export type CargoProductOption = {
  label: string;
  description: string;
  aliases: string[];
};

export const cargoProductOptions: CargoProductOption[] = [
  product("General cargo", "Standard dry cargo", ["general", "gcr", "dry cargo", "standard cargo"]),
  product("Automotive", "Automotive parts and components", ["automotive parts", "car parts", "vehicle parts"]),
  product("Pharmaceuticals", "Temperature-sensitive pharma cargo", ["pharma", "pharmaceutical", "medicines", "medical"]),
  product("Temperature controlled", "Active or passive cool-chain shipments", ["temp control", "cool chain", "temperature", "+2", "+8", "reefer"]),
  product("Perishables", "Fresh food, flowers, and time-sensitive perishables", ["fresh", "flowers", "food", "fruit", "vegetables"]),
  product("Dangerous goods", "DG acceptance and compliant handling", ["dg", "dangerous", "hazmat", "class 9", "un3480"]),
  product("Lithium batteries", "Battery shipments requiring DG controls", ["battery", "batteries", "lithium", "un3480", "un3090"]),
  product("E-commerce", "Parcel and cross-border e-commerce flows", ["ecommerce", "parcel", "cross-border"]),
  product("Express cargo", "Priority and time-critical shipments", ["express", "priority", "urgent", "time critical"]),
  product("Live animals", "AVI shipments", ["avi", "animals", "pets"]),
  product("Valuables", "High-value cargo and secure handling", ["valuable", "high value", "secure"]),
  product("Oversized cargo", "Heavy, outsized, or project cargo", ["oversized", "heavy", "project cargo", "outsize"]),
  product("Humanitarian cargo", "Relief, NGO, and emergency shipments", ["humanitarian", "relief", "ngo", "aid"]),
  product("Mail", "Postal and mail traffic", ["postal", "post"]),
  product("AOG", "Aircraft-on-ground urgent parts", ["aircraft on ground", "aircraft parts"]),
];

export function normalizeCargoProduct(value: string | undefined) {
  const normalized = normalize(value);
  if (!normalized) return cargoProductOptions[0].label;
  const exact = cargoProductOptions.find((option) => normalize(option.label) === normalized);
  if (exact) return exact.label;
  const alias = cargoProductOptions.find((option) => option.aliases.some((item) => normalized.includes(normalize(item)) || normalize(item).includes(normalized)));
  return alias?.label ?? cargoProductOptions[0].label;
}

function product(label: string, description: string, aliases: string[]): CargoProductOption {
  return { label, description, aliases };
}

function normalize(value: string | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
