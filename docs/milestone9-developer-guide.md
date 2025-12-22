# Milestone 9 Developer Guide
## Quick Reference for Using the Monetisation System

### Checking User Plan

```typescript
import { getUserPlan } from "@/lib/entitlements";

const plan = await getUserPlan(userId);
if (!plan) {
  // Handle error
}

// Check plan type
if (plan.plan_type === "PRO") {
  // User has PRO plan
}

// Check if in trial
import { isInTrial } from "@/lib/plans";
if (isInTrial(plan)) {
  // User is currently trialing
}
```

### Checking Feature Access

```typescript
import { isFeatureEnabled, canUseFeature } from "@/lib/entitlements";

// Simple check
const hasAccess = isFeatureEnabled(plan, "tone_variants");

// Check with limits
const { allowed, reason, currentUsage } = await canUseFeature(
  userId,
  plan,
  "reminder_volume"
);

if (!allowed) {
  // Show error: reason
  // Display: currentUsage / limit
}
```

### Client-Side Usage

```typescript
import { usePlan, useProAccess } from "@/hooks/use-plan";

function MyComponent() {
  const { plan, entitlements, loading } = usePlan();
  const hasPro = useProAccess();

  if (loading) return <Loading />;

  if (!hasPro) {
    return <UpgradePrompt />;
  }

  // Render PRO features
}
```

### Starting a Trial

```typescript
import { startTrial, isEligibleForTrial } from "@/lib/trials";

// Check eligibility first
const eligibility = await isEligibleForTrial(userId);
if (!eligibility.eligible) {
  // Show message: eligibility.reason
  return;
}

// Start trial
const result = await startTrial(userId, 14); // 14 days
if (!result.success) {
  // Show error: result.error
}
```

### Gating UI Components

```typescript
import { useProAccess } from "@/hooks/use-plan";
import { Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function GatedFeature() {
  const hasPro = useProAccess();

  if (!hasPro) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          This feature is available on PRO. Upgrade to unlock.
        </AlertDescription>
      </Alert>
    );
  }

  return <ProFeature />;
}
```

### Server-Side API Gating

```typescript
import { getUserPlan, isFeatureEnabled } from "@/lib/entitlements";

export async function POST(request: Request) {
  const plan = await getUserPlan(userId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Check feature access
  if (!isFeatureEnabled(plan, "advanced_settings")) {
    return NextResponse.json(
      { error: "Feature not available on your plan" },
      { status: 403 }
    );
  }

  // Proceed with feature
}
```

### Checking Usage Limits

```typescript
import { getUsage, canUseFeature } from "@/lib/usage-metering";
import { getUserPlan } from "@/lib/entitlements";

// Get current usage
const usage = await getUsage(userId, "reminders_active");

// Check if action is allowed
const plan = await getUserPlan(userId);
const { allowed, currentUsage } = await canUseFeature(
  userId,
  plan,
  "reminder_volume"
);

if (!allowed) {
  // Prevent action, show limit message
}
```

### Admin Functions

```typescript
// Update user plan (admin only)
const response = await fetch("/api/admin/plans", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    target_user_id: userId,
    plan_type: "PRO",
    subscription_status: "active",
  }),
});

// Force start trial (admin only)
const response = await fetch("/api/admin/plans/trial/start", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    target_user_id: userId,
    duration_days: 14,
  }),
});
```

### Feature Matrix Reference

| Feature | FREE | PRO |
|---------|------|-----|
| Smart Snooze | ✅ | ✅ |
| Contacts | ✅ | ✅ |
| Weekly Digest | Limited (light) | ✅ Full |
| Trust & Audit UI | Limited (7 days) | ✅ Unlimited |
| Advanced Settings | ❌ | ✅ |
| Tone Variants | Neutral only | ✅ All |
| Reminder Volume | 50 max | 500 max |

### Common Patterns

**Pattern 1: Gate a Setting**
```typescript
const hasPro = useProAccess();
<Select disabled={!hasPro && value !== "free_option"}>
  {/* options */}
</Select>
```

**Pattern 2: Show Upgrade Prompt**
```typescript
{!hasPro && (
  <Alert>
    <AlertDescription>
      Upgrade to PRO to unlock this feature.
    </AlertDescription>
  </Alert>
)}
```

**Pattern 3: Server-Side Check**
```typescript
const plan = await getUserPlan(userId);
if (!isFeatureEnabled(plan, "feature_name")) {
  return NextResponse.json(
    { error: "Feature not available" },
    { status: 403 }
  );
}
```

### Testing

**Create Test Users:**
```sql
-- FREE user
UPDATE profiles SET plan_type = 'FREE', subscription_status = 'none' WHERE id = 'user_id';

-- PRO user
UPDATE profiles SET plan_type = 'PRO', subscription_status = 'active' WHERE id = 'user_id';

-- Trial user
UPDATE profiles 
SET plan_type = 'PRO', 
    subscription_status = 'trialing',
    trial_ends_at = NOW() + INTERVAL '14 days'
WHERE id = 'user_id';
```

---

For more details, see `docs/milestone9-implementation-summary.md`

