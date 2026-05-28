// Single source of truth for plan limits (server + client safe)
export type PlanName = "free" | "starter" | "pro" | "premium" | "business";

export interface PlanLimits {
  generations: number;   // -1 = unlimited
  regenerations: number; // -1 = unlimited
  label: string;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free:     { generations: 15,  regenerations: 10,  label: "Free" },
  starter:  { generations: 50,  regenerations: 20,  label: "Starter" },
  pro:      { generations: 200, regenerations: -1,  label: "Pro" },
  premium:  { generations: 500, regenerations: 250, label: "Premium" },
  business: { generations: -1,  regenerations: -1,  label: "Business" },
};

export const PLAN_ORDER: PlanName[] = ["free", "starter", "pro", "premium", "business"];

export function isUnlimited(n: number) {
  return n < 0;
}
