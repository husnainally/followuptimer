"use client";

import {
  useFormContext,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

import { Switch, SwitchProps } from "./ui/switch";
import { Asterisk } from 'lucide-react';

type TControlledSwitchProps<T extends FieldValues> = {
  name: Path<T>;
  control?: Control<T>;
  label?: string;
  required?: boolean;
  description?: string;
} & Omit<SwitchProps, "name" | "ref">;

export function ControlledSwitch<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required = false,
  ...switchProps
}: TControlledSwitchProps<T>) {
  const ctx = useFormContext<T>();
  const ctl = control ?? ctx.control;

  return (
    <FormField
      control={ctl}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-white">
          <div className="space-y-0.5">
            {label ? (
              <FormLabel className="gap-1 flex items-center text-base">
                {label}
                {required && <Asterisk className="w-3 h-3 text-destructive" />}
              </FormLabel>
            ) : null}
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              {...switchProps}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
