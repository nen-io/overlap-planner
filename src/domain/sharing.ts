import {
  defaultConfiguration,
  MAX_PAYLOAD_BYTES,
  PlannerError,
  validateConfiguration,
  type Configuration,
} from "./planner";
const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
export function encodeConfiguration(config: Configuration): string {
  const payload = encodeURIComponent(
    JSON.stringify(validateConfiguration(config)),
  );
  if (bytes(payload) > MAX_PAYLOAD_BYTES)
    throw new PlannerError("This link exceeds the 8 KiB sharing limit.");
  return `#plan=${payload}`;
}
export function decodeConfiguration(hash: string): {
  config: Configuration;
  warning: string;
} {
  if (!hash) return { config: defaultConfiguration(), warning: "" };
  try {
    if (bytes(hash) > MAX_PAYLOAD_BYTES + 6 || !hash.startsWith("#plan="))
      throw new PlannerError("Malformed or oversized sharing link.");
    const decoded = decodeURIComponent(hash.slice(6));
    if (bytes(decoded) > MAX_PAYLOAD_BYTES)
      throw new PlannerError("Sharing payload is too large.");
    return { config: validateConfiguration(JSON.parse(decoded)), warning: "" };
  } catch {
    return {
      config: defaultConfiguration(),
      warning:
        "This sharing link is invalid or unsupported. A safe sample plan has been loaded.",
    };
  }
}
export function shareUrl(base: string, config: Configuration): string {
  const url = new URL(base);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new PlannerError("Sharing requires an HTTP or HTTPS page.");
  url.search = "";
  url.hash = encodeConfiguration(config).slice(1);
  return url.toString();
}
