/**
 * Milestone 9: Client-side plan hook
 * React hook for accessing user plan and entitlements
 */

import { useState, useEffect } from "react";
import { UserPlan } from "@/lib/plans";
import { FeatureEntitlement } from "@/lib/entitlements";

interface PlanData {
  plan: UserPlan | null;
  entitlements: FeatureEntitlement[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get current user's plan and entitlements
 */
export function usePlan(): PlanData {
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [entitlements, setEntitlements] = useState<FeatureEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      try {
        setLoading(true);
        const response = await fetch("/api/plans");
        if (!response.ok) {
          throw new Error("Failed to load plan");
        }
        const data = await response.json();
        setPlan(data.plan);
        setEntitlements(data.entitlements || []);
        setError(null);
      } catch (err) {
        console.error("Failed to load plan:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, []);

  return { plan, entitlements, loading, error };
}

/**
 * Hook to check if user has PRO access
 */
export function useProAccess(): boolean {
  const { plan } = usePlan();
  if (!plan) return false;
  
  return (
    plan.plan_type === "PRO" ||
    plan.plan_type === "TEAM" ||
    plan.subscription_status === "trialing"
  );
}

