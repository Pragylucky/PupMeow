import { MapPin, SlidersHorizontal, X } from "lucide-react";

interface Extra { name: string; label: string; value: string; options: { value: string; label: string }[] }

/** Plain GET form, so filters work without JavaScript and filtered URLs can be shared. */
export function ListingFilters({ basePath, areas, area, hidden, extra = [] }: { basePath: string; areas: string[]; area?: string; hidden?: Record<string, string>; extra?: Extra[] }) {
  const active = Boolean(area || extra.some((e) => e.value));
  const pill = "h-10 rounded-full border-2 border-border bg-surface px-3.5 text-sm font-bold text-text hover:border-muted/60 focus:border-primary focus:outline-none";
  return (
    <form action={basePath} className="mb-5 flex flex-wrap items-center gap-2" aria-label="Filters">
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <span className="hidden items-center gap-1.5 pr-1 text-sm font-extrabold text-muted sm:inline-flex"><SlidersHorizontal className="h-4 w-4" aria-hidden /> Filter</span>
      <label className="relative">
        <span className="sr-only">Area</span>
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input name="area" list={`${basePath.replace(/\W/g, "")}-areas`} defaultValue={area ?? ""} placeholder="Any area" className={`${pill} w-44 pl-9`} />
        <datalist id={`${basePath.replace(/\W/g, "")}-areas`}>{areas.map((a) => <option key={a} value={a} />)}</datalist>
      </label>
      {extra.map((e) => (
        <label key={e.name}>
          <span className="sr-only">{e.label}</span>
          <select name={e.name} defaultValue={e.value} className={`${pill} appearance-none pr-8`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23566174' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.8rem center" }}>
            {e.options.map((o) => <option key={o.value} value={o.value}>{o.value === "" ? `${e.label}: ${o.label}` : o.label}</option>)}
          </select>
        </label>
      ))}
      <button className="h-10 rounded-full bg-strong px-4 text-sm font-bold text-on-strong hover:opacity-90">Apply</button>
      {active && (
        <a href={`${basePath}?${new URLSearchParams(hidden ?? {})}`} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-bold text-muted hover:bg-surface-2 hover:text-text">
          <X className="h-4 w-4" aria-hidden /> Clear
        </a>
      )}
    </form>
  );
}
