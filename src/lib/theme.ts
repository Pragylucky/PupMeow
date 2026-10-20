/** Light / dark / system theme, stored per browser. Applied before paint by the inline script in the root layout. */
export type ThemeChoice = "light" | "dark" | "system";
const KEY = "pupmeow:theme";

export function getTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function setTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* storage blocked: still applies for this visit */
  }
}

export function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  setTheme(isDark ? "light" : "dark");
}
