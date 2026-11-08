export function filterIntegerInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function filterUppercaseAlphanumericInput(value: string, maxLength?: number): string {
  const filtered = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return maxLength == null ? filtered : filtered.slice(0, maxLength);
}

export function filterDecimalInput(value: string): string {
  let result = "";
  let hasDecimal = false;

  for (const char of value) {
    if (char === "-" && result.length === 0) {
      result = "-";
    } else if (char === "." && !hasDecimal) {
      hasDecimal = true;
      result += char;
    } else if (char >= "0" && char <= "9") {
      result += char;
    }
  }

  return result;
}
