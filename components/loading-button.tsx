import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";

export interface LoadingButtonProps
  extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: React.ReactNode;
}

export const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  LoadingButtonProps
>(function LoadingButton(
  { children, isLoading = false, loadingText, disabled, ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-live="polite"
      {...props}
    >
      {isLoading && (
        <Loader2Icon
          className="size-4 animate-spin"
          aria-hidden="true"
        />
      )}
      <span>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </Button>
  );
});

