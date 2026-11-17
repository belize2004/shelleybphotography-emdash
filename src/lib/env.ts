export type RuntimeEnvironment = Record<string, string | undefined> | undefined;

export function getRuntimeValue(key: string, env?: RuntimeEnvironment): string | undefined {
  if (env && typeof env === "object" && key in env) {
    const val = env[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  if (typeof process !== "undefined" && process.env && key in process.env) {
    const val = process.env[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return undefined;
}
