// Korean phone-number auto-formatting (ported from static/js/common.js).
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");

  if (digits.startsWith("02")) {
    // Seoul landline: 02-xxx(x)-xxxx
    if (digits.length < 3) return digits;
    if (digits.length < 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length < 10)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.startsWith("1") && !digits.startsWith("10")) {
    // 15xx / 16xx style service numbers: xxxx-xxxx
    if (digits.length < 5) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
  }

  // Standard mobile / landline: xxx-xxx(x)-xxxx
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length < 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}
