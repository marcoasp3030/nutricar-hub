// Shared billing helpers for advertising packages / templates / contracts.

export type BillingType = "mensal" | "unico" | "anual" | "personalizado";

export const BILLING_TYPE_OPTIONS: { value: BillingType; label: string; shortSuffix: string }[] = [
  { value: "mensal", label: "Mensal (recorrente)", shortSuffix: "/mês" },
  { value: "unico", label: "Valor único (à vista ou parcelado)", shortSuffix: " (único)" },
  { value: "anual", label: "Anual (recorrente)", shortSuffix: "/ano" },
  { value: "personalizado", label: "Personalizado", shortSuffix: "" },
];

export const BILLING_TYPE_LABEL: Record<string, string> = {
  mensal: "Mensal",
  unico: "Valor único",
  anual: "Anual",
  personalizado: "Personalizado",
};

const fmtBRL = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Returns a clear price line for a package, e.g. "R$ 500,00 /mês" or "R$ 1.200,00 (único)". */
export function formatPackagePrice(pkg: any): { main: string; suffix: string; note?: string } {
  if (!pkg) return { main: fmtBRL(0), suffix: "" };
  const type: BillingType = (pkg.billing_type as BillingType) || "mensal";
  const value = Number(pkg.monthly_value) || 0;
  const main = fmtBRL(value);

  if (type === "mensal") {
    return {
      main,
      suffix: "/mês",
      note: pkg.duration_months && pkg.duration_months > 1 ? `${pkg.duration_months} mês(es)` : undefined,
    };
  }
  if (type === "anual") {
    return { main, suffix: "/ano" };
  }
  if (type === "unico") {
    return { main, suffix: " (pagamento único)" };
  }
  // personalizado
  return { main, suffix: pkg.billing_label ? ` ${pkg.billing_label}` : "" };
}

/** Returns the contract's recurring/charge total considering installments for one-time. */
export function contractMonthlyEquivalent(contract: any): number {
  const pkg = contract?.ad_packages;
  if (!pkg) return 0;
  const type: BillingType = (pkg.billing_type as BillingType) || "mensal";
  const value = Number(pkg.monthly_value) || 0;
  if (type === "mensal") return value;
  return 0; // únicos/anuais não somam como mensalidade
}
