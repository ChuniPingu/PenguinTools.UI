// Consume strings whole so number-like text inside them is never rewritten.
const JSON_STRING = /"(?:[^"\\]|\\.)*"/;
const JSON_NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const JSON_TOKEN = new RegExp(`${JSON_STRING.source}|${JSON_NUMBER.source}`, "g");

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);

export function parseCliJsonLine(line: string): unknown {
  return JSON.parse(quoteUnsafeIntegers(line));
}

export function quoteUnsafeIntegers(json: string): string {
  return json.replace(JSON_TOKEN, (token) => {
    if (token.startsWith('"') || /[.eE]/.test(token)) return token;
    const value = BigInt(token);
    return value <= MAX_SAFE && value >= MIN_SAFE ? token : `"${token}"`;
  });
}

export function formatUnsignedIntegerString(value: string | number): string {
  return typeof value === "string" ? value : String(value);
}
