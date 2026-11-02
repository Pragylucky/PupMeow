"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Syringe, Pill, Stethoscope, Scale, FileText, Trash2, Sparkles, Lock } from "lucide-react";
import { addHealthRecord, deleteHealthRecord, getDocumentUrl, addVaccineReminders, setNextDueDate } from "@/lib/actions/pets";
import { DUE_PRESETS, dueFromPreset, suggestedPreset } from "@/lib/care";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddToCalendar, MarkGivenButton } from "@/components/features/care/reminder-actions";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { ImageUploader } from "@/components/features/upload/image-uploader";
import { WeightChart } from "./weight-chart";
import { cn, daysUntil, dueLabel, formatDate, todayIso } from "@/lib/utils";
import type { HealthRecordRow, HealthRecordType, PetRow } from "@/types/database";
import type { ActionResult } from "@/types/models";

const TYPE_META: Record<HealthRecordType, { label: string; short: string; icon: typeof Syringe; tone: string }> = {
  vaccination: { label: "Vaccinations", short: "Vaccines", icon: Syringe, tone: "bg-danger-soft text-danger" },
  medication: { label: "Medications", short: "Meds", icon: Pill, tone: "bg-cat-soft text-cat" },
  vet_visit: { label: "Vet visits", short: "Vet visits", icon: Stethoscope, tone: "bg-secondary-soft text-on-secondary" },
  weight: { label: "Weight", short: "Weight", icon: Scale, tone: "bg-primary-soft text-primary-strong" },
};

type Filter = "all" | HealthRecordType;

export function HealthDashboard({ pet, records, userId, aiEnabled, disclaimer, initialTab = "all" }: { pet: PetRow; records: HealthRecordRow[]; userId: string; aiEnabled: boolean; disclaimer: string; initialTab?: Filter }) {
  const [tab, setTab] = useState<Filter>(initialTab);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<HealthRecordRow | null>(null);
  const toast = useToast();
  const router = useRouter();
  const list = tab === "all" ? records : records.filter((r) => r.type === tab);
  const weights = records.filter((r) => r.type === "weight" && r.weight_kg).map((r) => ({ date: r.date, kg: Number(r.weight_kg) }));
  // Latest vaccine / medicine entries that have no next due date yet: nudge the owner to set one.
  const needsDue = new Set<string>();
  const seen = new Set<string>();
  for (const r of [...records].sort((a, b) => b.date.localeCompare(a.date))) {
    if (r.type !== "vaccination" && r.type !== "medication") continue;
    const key = r.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!r.next_due_date) needsDue.add(r.id);
  }
  const sorted = [...list].sort((a, b) => {
    // Due items first (soonest first), then everything else newest first.
    if (a.next_due_date && b.next_due_date) return a.next_due_date.localeCompare(b.next_due_date);
    if (a.next_due_date) return -1;
    if (b.next_due_date) return 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 rounded-[var(--radius-lg)] bg-ink px-4 py-3 text-[0.95rem] font-bold text-white">
        <Lock className="h-4 w-4 shrink-0" aria-hidden /> Private to you. Nobody else can see {pet.name}&apos;s health records.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs ariaLabel="Record type" value={tab} onChange={(v) => setTab(v as Filter)} items={[
          { value: "all", label: "All", count: records.length },
          ...(Object.keys(TYPE_META) as HealthRecordType[]).map((t) => ({ value: t, label: TYPE_META[t].short, count: records.filter((r) => r.type === t).length })),
        ]} />
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Add record</Button>
      </div>

      {(tab === "all" || tab === "weight") && weights.length > 0 && (
        <section className="rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Weight</h2>
            <span className="font-heading text-xl font-semibold">{weights.sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.kg} kg</span>
          </div>
          <WeightChart points={weights} />
        </section>
      )}

      {aiEnabled && (tab === "all" || tab === "vaccination") && <VaccineSuggest pet={pet} disclaimer={disclaimer} onAdded={() => router.refresh()} />}

      <section aria-label="Timeline">
        {sorted.length ? (
          <ul className="space-y-2.5">
            {sorted.map((r) => {
              const meta = TYPE_META[r.type];
              const status = statusFor(r);
              const title = r.title.replace(/^Reminder:\s*/i, "");
              return (
                <li key={r.id} className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", meta.tone)}><meta.icon className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{title}{r.weight_kg ? ` · ${r.weight_kg} kg` : ""}</p>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-[0.75rem] font-extrabold", status.tone)}>{status.label}</span>
                      </div>
                      <p className="text-sm text-muted">{meta.label.replace(/s$/, "")} · {formatDate(r.date)}{r.next_due_date ? ` · next due ${formatDate(r.next_due_date)}` : ""}</p>
                      {r.notes && <p className="mt-1 whitespace-pre-line text-[0.95rem]">{r.notes}</p>}
                      {r.document_url && <OpenDocument path={r.document_url} />}
                    </div>
                    <button type="button" onClick={() => setToDelete(r)} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-danger" aria-label={`Delete ${title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {!r.next_due_date && needsDue.has(r.id) && <NextDuePrompt record={r} onDone={() => router.refresh()} />}
                  {r.next_due_date && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 pl-14">
                      <AddToCalendar label="Remind me" event={{ title: `${pet.name}: ${title}`, start: r.next_due_date, details: `Pupmeow reminder for ${pet.name}. Last given ${formatDate(r.date)}.${r.notes ? ` ${r.notes}` : ""}` }} />
                      <MarkGivenButton recordId={r.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState tone="card" art="paw" title={tab === "all" ? "No records yet" : `No ${TYPE_META[tab].label.toLowerCase()} yet`} description="Keep vaccines, medicines, vet visits and weight in one place. Handy at the vet." action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Add the first one</Button>} />
        )}
      </section>

      <AddRecordModal open={adding} onClose={() => setAdding(false)} petId={pet.id} userId={userId} defaultType={tab === "all" ? "vaccination" : tab} onSaved={() => { setAdding(false); router.refresh(); }} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        destructive
        title="Delete this record?"
        description={toDelete?.title}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!toDelete) return;
          const res = await deleteHealthRecord(toDelete.id);
          setToDelete(null);
          toast(res.ok ? res.message ?? "Deleted" : res.error, res.ok ? "success" : "error");
          router.refresh();
        }}
      />
    </div>
  );
}

function statusFor(r: HealthRecordRow): { label: string; tone: string } {
  if (r.next_due_date) {
    const n = daysUntil(r.next_due_date);
    if (n < 0) return { label: "Overdue", tone: "bg-danger text-white" };
    if (n <= 14) return { label: dueLabel(r.next_due_date).replace(/^due /, "Due "), tone: "bg-secondary text-ink" };
    return { label: "Planned", tone: "bg-cat-soft text-text" };
  }
  return { label: "Done", tone: "bg-primary text-on-primary" };
}

function OpenDocument({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline disabled:opacity-60"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await getDocumentUrl(path);
        setLoading(false);
        if (res.ok && res.data) window.open(res.data, "_blank", "noopener,noreferrer");
        else toast(res.ok ? "Couldn't open" : res.error, "error");
      }}
    >
      <FileText className="h-4 w-4" aria-hidden /> {loading ? "Opening…" : "View certificate"}
    </button>
  );
}

function AddRecordModal({ open, onClose, petId, userId, defaultType, onSaved }: { open: boolean; onClose: () => void; petId: string; userId: string; defaultType: HealthRecordType; onSaved: () => void }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addHealthRecord, null);
  const [type, setType] = useState<HealthRecordType>(defaultType);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [nextDue, setNextDue] = useState("");
  const toast = useToast();
  useEffect(() => {
    setType(defaultType);
    setTitle("");
    setDate(todayIso());
    setNextDue("");
  }, [defaultType, open]);
  const suggested = type === "weight" ? null : suggestedPreset(title, type);
  useEffect(() => {
    if (state?.ok) { toast(state.message ?? "Saved"); onSaved(); }
  }, [state, toast, onSaved]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <Modal open={open} onClose={onClose} title="Add health record" variant="sheet">
      <form action={action} className="space-y-4" key={String(open)}>
        <input type="hidden" name="pet_id" value={petId} />
        <Select label="Type" name="type" value={type} onChange={(e) => setType(e.target.value as HealthRecordType)} options={[
          { value: "vaccination", label: "Vaccination" }, { value: "medication", label: "Medication" },
          { value: "vet_visit", label: "Vet visit" }, { value: "weight", label: "Weight" },
        ]} />
        <Input label="Title" name="title" required maxLength={80} value={type === "weight" && !title ? "Weight check" : title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "vaccination" ? "Anti-Rabies" : type === "medication" ? "Deworming tablet" : "Annual check-up"} error={fe.title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker label="Date" name="date" required value={date} onChange={(e) => setDate(e.target.value)} error={fe.date} />
          {type === "weight" ? (
            <Input label="Weight (kg)" name="weight_kg" type="number" step="0.1" inputMode="decimal" required error={fe.weight_kg} />
          ) : (
            <DatePicker label="Next due (optional)" name="next_due_date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} min={date} error={fe.next_due_date} />
          )}
        </div>
        {type !== "weight" && (
          <div className="-mt-1" aria-label="Quick next due date">
            <p className="mb-1.5 text-sm font-bold">Next dose in…{!nextDue && <span className="font-semibold text-muted"> (so we can remind you)</span>}</p>
            <div className="flex flex-wrap gap-2">
              {DUE_PRESETS.map((p) => {
                const value = dueFromPreset(date || todayIso(), p);
                const on = nextDue === value;
                return (
                  <button key={p.label} type="button" onClick={() => setNextDue(on ? "" : value)} aria-pressed={on} className={cn("h-9 rounded-full border-2 px-3.5 text-sm font-bold", on ? "border-primary bg-primary text-on-primary" : "border-border bg-surface hover:border-muted/60")}>
                    {p.label}{suggested?.label === p.label && !on ? " ✨" : ""}
                  </button>
                );
              })}
            </div>
            {nextDue && <p className="mt-1.5 text-sm text-muted">Due {formatDate(nextDue)}. We&apos;ll remind you 3 days before, on the day, and a week after.</p>}
          </div>
        )}
        <Textarea label="Notes" name="notes" maxLength={1000} rows={3} />
        {type !== "weight" && (
          <ImageUploader bucket="documents" userId={userId} name="document_url" label="Certificate or prescription (optional)" hint="Photo or PDF, max 5 MB. Private to you." max={1} onUploadingChange={setUploading} />
        )}
        {state && !state.ok && <p role="alert" className="text-sm font-semibold text-danger">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending} disabled={uploading}>Save record</Button>
        </div>
      </form>
    </Modal>
  );
}

interface Suggestion { title: string; due_date: string; reason: string }

function VaccineSuggest({ pet, disclaimer, onAdded }: { pet: PetRow; disclaimer: string; onAdded: () => void }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  return (
    <Card className="bg-cream p-4 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-secondary" aria-hidden /> Vaccine helper</p>
          <p className="text-xs text-muted">Suggests what may be due based on {pet.name}&apos;s age and records. {disclaimer}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const res = await fetch("/api/ai/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId: pet.id }) });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error ?? "Couldn't get suggestions");
              setItems(json.suggestions as Suggestion[]);
              setPicked(Object.fromEntries((json.suggestions as Suggestion[]).map((_, i) => [i, true])));
            } catch (e) {
              toast(e instanceof Error ? e.message : "AI unavailable", "error");
            } finally {
              setLoading(false);
            }
          }}
        >
          Suggest upcoming
        </Button>
      </div>
      {items && (
        items.length ? (
          <div className="mt-3 space-y-3">
            {items.map((s, i) => (
              <Checkbox key={i} name={`sug-${i}`} checked={!!picked[i]} onChange={(e) => setPicked((p) => ({ ...p, [i]: e.target.checked }))} label={`${s.title} — ${formatDate(s.due_date)}`} description={s.reason} />
            ))}
            <Button
              size="sm"
              loading={saving}
              disabled={!Object.values(picked).some(Boolean)}
              onClick={async () => {
                setSaving(true);
                const res = await addVaccineReminders(pet.id, items.filter((_, i) => picked[i]).map((s) => ({ title: s.title, due_date: s.due_date })));
                setSaving(false);
                toast(res.ok ? res.message ?? "Added" : res.error, res.ok ? "success" : "error");
                if (res.ok) { setItems(null); onAdded(); }
              }}
            >
              Add selected as reminders
            </Button>
          </div>
        ) : <p className="mt-3 text-sm text-muted">Looks up to date. Keep checking with your vet. 🐾</p>
      )}
    </Card>
  );
}

/** One-tap "when is the next one?" for a done vaccine or medicine, so a reminder gets scheduled. */
function NextDuePrompt({ record, onDone }: { record: HealthRecordRow; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const suggested = suggestedPreset(record.title, record.type);
  const save = async (label: string, due: string) => {
    setBusy(label);
    const res = await setNextDueDate(record.id, due);
    setBusy(null);
    toast(res.ok ? res.message ?? "Saved" : res.error, res.ok ? "success" : "error");
    if (res.ok) onDone();
  };
  return (
    <div className="mt-3 border-t border-border pt-3 pl-14">
      <p className="mb-1.5 text-sm font-bold">When is the next one due? <span className="font-semibold text-muted">We&apos;ll remind you.</span></p>
      <div className="flex flex-wrap gap-2">
        {DUE_PRESETS.map((p) => (
          <Button key={p.label} size="sm" variant={suggested?.label === p.label ? "primary" : "outline"} loading={busy === p.label} disabled={busy !== null} onClick={() => save(p.label, dueFromPreset(record.date, p))}>
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
