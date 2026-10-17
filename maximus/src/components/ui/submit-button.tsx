"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "./button";

type Props = Omit<ComponentProps<"button">, "type"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pendingLabel?: string;
};

/** Submit button that shows a spinner while its parent <form> action runs. */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
