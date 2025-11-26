"use client";

import {
  useFormContext,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { Asterisk } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Textarea } from "./ui/textarea";
import type { ComponentProps } from "react";

type TextareaProps = ComponentProps<typeof Textarea>;

type TControlledTextareaProps<T extends FieldValues> = {
  name: Path<T>;
  control?: Control<T>;
  label?: string;
  required?: boolean;
  description?: string;
} & Omit<TextareaProps, "name" | "ref">;

export function ControlledTextarea<T extends FieldValues>({
  name,
  control,
  label,
  description,
  required = false,
  ...textareaProps
}: TControlledTextareaProps<T>) {
  const ctx = useFormContext<T>();
  const ctl = control ?? ctx.control;

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
            <Textarea
              {...field}
              {...textareaProps}
              className={`${textareaProps.className || ""}`}
            />
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

