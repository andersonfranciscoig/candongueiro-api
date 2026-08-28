/** Formatação partilhada pelos templates de email. */
export function formatKz(amount: number): string {
  const value = Math.abs(amount);
  return `${value.toLocaleString("pt-AO")} Kz`;
}

export function formatSignedKz(amount: number): string {
  const prefix = amount >= 0 ? "+" : "−";
  return `${prefix}${formatKz(amount)}`;
}

export function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-AO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
