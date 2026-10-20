import { forwardRef } from "react";
import { Input, type InputProps } from "./input";

/** Native date / datetime picker — best UX on Android & iOS, accessible by default. */
export const DatePicker = forwardRef<HTMLInputElement, Omit<InputProps, "type"> & { withTime?: boolean }>(
  function DatePicker({ withTime, ...props }, ref) {
    return <Input ref={ref} type={withTime ? "datetime-local" : "date"} {...props} />;
  },
);
