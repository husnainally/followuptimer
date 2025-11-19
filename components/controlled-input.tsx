"use client";

import { useState } from "react";
import {
  useFormContext,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";



import { Asterisk, Eye, EyeOff } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input, InputProps } from "./ui/input";

type TControlledInputProps<T extends FieldValues> = {
  name: Path<T>;
  control?: Control<T>;
  label?: string;
  required?: boolean;
  description?: string;

  /** optional icons */
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;

  /** password toggle automatically triggers for type="password" */
} & Omit<InputProps, "name" | "ref">;

export function ControlledInput<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required = false,
  type = "text",
  startIcon,
  endIcon,
  ...inputProps
}: TControlledInputProps<T>) {
  const ctx = useFormContext<T>();
  const ctl = control ?? ctx.control;

  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const currentType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <FormField
      control={ctl}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label ? (
            <FormLabel className="gap-0 flex items-center">
              {label}
              {required && <Asterisk className="w-3 h-3 text-red-500 ml-1" />}
            </FormLabel>
          ) : null}

          <FormControl>
            <div className="relative flex items-center">
              
              {/* START ICON */}
              {startIcon && (
                <span className="absolute left-3 text-muted-foreground">
                  {startIcon}
                </span>
              )}

              <Input
                type={currentType}
                {...field}
                {...inputProps}
                className={`${inputProps.className} ${
                  startIcon ? "pl-10" : ""
                } ${isPassword || endIcon ? "pr-10" : ""}`}
              />

              {/* PASSWORD TOGGLE */}
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* END ICON (disabled for password type since password uses toggle) */}
              {!isPassword && endIcon && (
                <span className="absolute right-3 text-muted-foreground">
                  {endIcon}
                </span>
              )}
            </div>
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
