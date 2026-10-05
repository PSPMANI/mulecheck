"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitReport, type ReportState } from "./actions";
import { SCAM_CATEGORIES, PAYMENT_TYPES, LINK_TYPES, CONTACT_TYPES, type IdentifierRow } from "@/lib/reportSchema";

type Opt = readonly { key: string; label: string }[];

export function ReportForm({ defaultType, defaultValue }: { defaultType: string; defaultValue: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {});

  // All inputs are controlled so a validation error never wipes what the victim typed.
  const [category, setCategory] = useState("");
  const [scamName, setScamName] = useState("");
  const [pay, setPay] = useState<IdentifierRow[]>([
    { kind: defaultType === "BANK" ? "BANK" : "UPI", value: defaultType === "UPI" || defaultType === "BANK" ? defaultValue : "" },
  ]);
  const [links, setLinks] = useState<IdentifierRow[]>([]);
  const [contacts, setContacts] = useState<IdentifierRow[]>(defaultType === "PHONE" || defaultType === "SOCIAL" ? [{ kind: defaultType, value: defaultValue }] : []);
  const [groups, setGroups] = useState<IdentifierRow[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  if (state.ok) {
    return (
      <div className="card p-8 text-center">
        <div className="badge badge-green">Received</div>
        <h2 className="text-2xl font-bold mt-3">Thank you. Your report is with the moderators.</h2>
        <p className="text-muted mt-2">Once verified, the accounts and links you reported will appear on the public board.</p>
        {typeof state.filesSaved === "number" && state.filesSaved > 0 && (
          <p className="text-sm text-ok mt-2">
            {state.filesSaved} screenshot{state.filesSaved === 1 ? "" : "s"} stored securely.
          </p>
        )}
        {state.filesRejected && state.filesRejected.length > 0 && (
          <ul className="text-xs text-warn mt-2">
            {state.filesRejected.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-center gap-2 mt-6">
          <Link href="/" className="btn">
            Back to home
          </Link>
          <Link href="/report" className="btn btn-danger">
            Report another
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="card p-6 space-y-6" encType="multipart/form-data">
      <input type="text" name="website_url_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <Section n={1} title="Type of scam">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Choose one *</span>
            <select name="category" required value={category} onChange={(e) => setCategory(e.target.value)} className="input mt-1">
              <option value="">Select</option>
              {SCAM_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-muted">Name of the scam / fraud {category === "OTHER" ? "*" : ""}</span>
            <input
              name="scamName"
              value={scamName}
              onChange={(e) => setScamName(e.target.value)}
              required={category === "OTHER"}
              className="input mt-1"
              placeholder={category === "OTHER" ? "You chose Other, please mention the name" : "e.g. QuickTask Jobs, Zeniq Trade Pro"}
            />
          </label>
        </div>
      </Section>

      <Section n={2} title="UPI ID or bank account number *">
        <RowList group="pay" rows={pay} setRows={setPay} options={PAYMENT_TYPES} placeholder="rahul@okaxis or 50100234567891" min={1} addLabel="Add another UPI / account" />
      </Section>

      <Section n={3} title="Website link or application link">
        <RowList group="link" rows={links} setRows={setLinks} options={LINK_TYPES} placeholder="https://... or app name" addLabel="Add website / app link" />
      </Section>

      <Section n={4} title="Telegram username, WhatsApp number or mobile number">
        <RowList group="contact" rows={contacts} setRows={setContacts} options={CONTACT_TYPES} placeholder="@username or 10-digit number" addLabel="Add contact" />
      </Section>

      <Section n={5} title="Group links">
        <RowList group="group" rows={groups} setRows={setGroups} options={[{ key: "GROUP", label: "Group link" }]} placeholder="https://t.me/... or https://chat.whatsapp.com/..." addLabel="Add group link" hideKind />
      </Section>

      <Section n={6} title="Screenshots of every page or chat history *">
        <input name="screenshots" type="file" multiple required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="input" />
        <p className="text-xs text-muted">Up to 8 files, 8 MB each. Stored privately, never shown in public. Used to verify and for police case files.</p>
      </Section>

      <Section n={7} title="Total amount lost (INR)">
        <input name="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="input sm:w-64" placeholder="0" />
      </Section>

      <Section n={8} title="Your description *">
        <textarea
          name="description"
          required
          minLength={20}
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
          placeholder="Explain in detail what happened, or anything else moderators should know."
        />
      </Section>

      <Section n={9} title="Your information (optional)">
        <p className="text-xs text-muted -mt-1">Private. Never displayed in public.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-muted">Name</span>
            <input name="reporterName" value={name} onChange={(e) => setName(e.target.value)} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Mobile number</span>
            <input name="reporterPhone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Email</span>
            <input name="reporterEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input mt-1" />
          </label>
        </div>
      </Section>

      {state.error && <div className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm">{state.error} Your entries are kept. Re-attach screenshots before submitting again.</div>}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">By submitting you confirm the report is truthful to the best of your knowledge.</p>
        <button disabled={pending} className="btn btn-danger">
          {pending ? "Uploading and submitting..." : "Submit report"}
        </button>
      </div>
    </form>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-fg mb-1">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg3 text-xs mr-2">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function RowList({
  group,
  rows,
  setRows,
  options,
  placeholder,
  addLabel,
  min = 0,
  hideKind = false,
}: {
  group: string;
  rows: IdentifierRow[];
  setRows: (r: IdentifierRow[]) => void;
  options: Opt;
  placeholder: string;
  addLabel: string;
  min?: number;
  hideKind?: boolean;
}) {
  const update = (i: number, patch: Partial<IdentifierRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows(rows.filter((_, j) => j !== i));
  const add = () => setRows([...rows, { kind: options[0].key, value: "" }]);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col sm:flex-row gap-2">
          {hideKind ? (
            <input type="hidden" name={`${group}_kind`} value={r.kind} />
          ) : (
            <select name={`${group}_kind`} value={r.kind} onChange={(e) => update(i, { kind: e.target.value })} className="input sm:w-56">
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <input
            name={`${group}_value`}
            value={r.value}
            onChange={(e) => update(i, { value: e.target.value })}
            required={i < min}
            className="input mono flex-1"
            placeholder={placeholder}
          />
          {rows.length > min && (
            <button type="button" onClick={() => remove(i)} className="btn btn-sm self-start sm:self-auto" aria-label="Remove">
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={add} className="btn btn-sm">
        + {addLabel}
      </button>
    </div>
  );
}
