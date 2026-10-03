/** Pure helpers (unit-tested) */

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

export function uniqueSlug(base: string, suffix: string): string {
  return `${slugify(base)}-${suffix.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase()}`;
}

export function formatCurrency(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

export function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}
