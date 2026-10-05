/** Keep what the user typed when a server action returns an error (React resets uncontrolled forms after an action). */
export type Values = Record<string, string>;

export function formValues(fd: FormData): Values {
  const out: Values = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.endsWith("_hp")) out[k] = v;
  return out;
}
