import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("lets later utilities override earlier ones", () => {
    expect(cn("bg-surface text-text px-4", "bg-white text-ink")).toBe("px-4 bg-white text-ink");
    expect(cn("h-9 w-9 rounded-full", "h-12 w-12")).toBe("rounded-full h-12 w-12");
    expect(cn("text-[0.8rem] font-bold", "text-lg font-extrabold")).toBe("text-lg font-extrabold");
  });
  it("keeps different slots and variants", () => {
    expect(cn("text-sm text-muted hover:text-text md:text-lg")).toBe("text-sm text-muted hover:text-text md:text-lg");
    expect(cn("gap-x-5 gap-y-2 p-4 px-2")).toBe("gap-x-5 gap-y-2 p-4 px-2");
    expect(cn("bg-[#e9efe6] bg-[linear-gradient(90deg,red_2px,transparent_2px)]")).toBe("bg-[#e9efe6] bg-[linear-gradient(90deg,red_2px,transparent_2px)]");
    expect(cn("rounded-full rounded-t-none text-center text-white")).toBe("rounded-full rounded-t-none text-center text-white");
    expect(cn("[&_svg]:shrink-0 [&_svg]:h-4", false, null, "shadow-[var(--shadow-card)] shadow-ink/10")).toBe("[&_svg]:shrink-0 [&_svg]:h-4 shadow-[var(--shadow-card)] shadow-ink/10");
  });
});

describe("cn display", () => {
  it("className can hide a block element", () => {
    expect(cn("block h-20", "hidden sm:block")).toBe("h-20 hidden sm:block");
  });
});
