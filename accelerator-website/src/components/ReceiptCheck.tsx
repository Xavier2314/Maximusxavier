"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, FileImage, LoaderCircle, TriangleAlert, Upload, X } from "lucide-react";
import { BANK_ACCOUNT } from "@/lib/fees";
import { fileFingerprint, readReceipt } from "@/lib/receipt-check";

type Item = {
  id: string;
  name: string;
  preview: string;
  state: "reading" | "done" | "error";
  amount: number | null;
  toOfficial: boolean;
  message?: string;
};

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

// One OCR worker for the whole visit. Text recognition runs on the visitor's device:
// the receipt image is never uploaded to our servers.
type OcrWorker = { recognize: (image: Blob) => Promise<{ data: { text: string } }> };
let workerPromise: Promise<OcrWorker> | null = null;
function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker }) => createWorker("eng") as unknown as Promise<OcrWorker>);
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

/** Large phone photos are slow to read: scale them down to at most 2000px first. */
async function prepare(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (scale === 1) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")?.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/png"));
  } catch {
    return file;
  }
}

export type ReceiptVerdict = { ok: boolean; totalNaira: number };

/**
 * Reads uploaded transfer receipts and checks that, together, they show at least the fee
 * paid into the official account. Several receipts can be added (e.g. ₦30,000 + ₦20,000).
 */
export function ReceiptCheck({ feeNaira, onVerdict }: { feeNaira: number; onVerdict: (v: ReceiptVerdict) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seen = useRef(new Set<string>());

  const valid = items.filter((i) => i.state === "done" && i.amount != null && i.toOfficial);
  const invalid = items.filter((i) => i.state === "error" || (i.state === "done" && (i.amount == null || !i.toOfficial)));
  const reading = items.some((i) => i.state === "reading");
  const total = valid.reduce((s, i) => s + (i.amount ?? 0), 0);
  const ok = !reading && invalid.length === 0 && valid.length > 0 && total >= feeNaira;
  const pct = Math.min(100, feeNaira ? (total / feeNaira) * 100 : 0);

  useEffect(() => { onVerdict({ ok, totalNaira: total }); }, [ok, total, onVerdict]);
  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  async function add(files: FileList | null) {
    setNotice(null);
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") || /hei[cf]/i.test(file.type)) {
        setNotice(`"${file.name}" can't be read here. Please upload a screenshot or photo of the receipt (JPG or PNG).`);
        continue;
      }
      if (file.size > 15 * 1024 * 1024) { setNotice(`"${file.name}" is too large. Please upload a screenshot instead.`); continue; }
      const id = await fileFingerprint(file);
      if (seen.current.has(id)) { setNotice("You already added that receipt. Each receipt counts once."); continue; }
      seen.current.add(id);
      setItems((list) => [...list, { id, name: file.name, preview: URL.createObjectURL(file), state: "reading", amount: null, toOfficial: false }]);
      try {
        const worker = await getWorker();
        const { data } = await worker.recognize(await prepare(file));
        const r = readReceipt(data.text);
        update(id, { state: "done", amount: r.amountNaira, toOfficial: r.toOfficialAccount });
      } catch {
        update(id, { state: "error", message: "We couldn't read this file. Check your connection, or upload a clearer screenshot." });
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    seen.current.delete(id);
    setItems((list) => {
      const gone = list.find((i) => i.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((i) => i.id !== id);
    });
  }

  return (
    <div>
      <label
        className="group flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-white/30 px-4 py-6 text-center transition-colors hover:border-white hover:bg-white/5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void add(e.dataTransfer.files); }}
      >
        <Upload size={22} className="text-[#9DB2FF] transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
        <span className="text-sm font-semibold">{items.length ? "Add another receipt" : "Upload your transfer receipt"}</span>
        <span className="text-xs text-mist">Screenshot or photo (JPG, PNG). Paid in parts? Add every receipt.</span>
        <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void add(e.target.files)} />
      </label>

      {notice && <p className="mt-3 flex items-start gap-2 text-xs text-[#FFB4B9]"><TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{notice}</p>}

      <ul className="mt-4 space-y-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {items.map((i) => {
            const bad = i.state === "error" || (i.state === "done" && (i.amount == null || !i.toOfficial));
            return (
              <motion.li key={i.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className={`flex items-center gap-3 border p-2.5 ${bad ? "border-[#FF6B76]/60 bg-[#E11E2D]/10" : "border-white/15 bg-white/5"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.preview} alt="" className="h-12 w-12 shrink-0 object-cover" />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="flex items-center gap-1.5 truncate text-mist"><FileImage size={12} aria-hidden="true" />{i.name}</p>
                  {i.state === "reading" && <p className="mt-1 flex items-center gap-1.5 text-white"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Reading receipt…</p>}
                  {i.state === "error" && <p className="mt-1 text-[#FFB4B9]">{i.message}</p>}
                  {i.state === "done" && i.amount == null && <p className="mt-1 text-[#FFB4B9]">We couldn&rsquo;t find the amount. Upload a clearer, uncropped screenshot.</p>}
                  {i.state === "done" && i.amount != null && !i.toOfficial && <p className="mt-1 text-[#FFB4B9]">{naira(i.amount)} found, but this receipt doesn&rsquo;t show the official account ({BANK_ACCOUNT.bank} {BANK_ACCOUNT.accountNumber}, {BANK_ACCOUNT.accountName}).</p>}
                  {i.state === "done" && i.amount != null && i.toOfficial && <p className="mt-1 flex items-center gap-1.5 text-white"><CircleCheck size={14} className="text-[#7CE0A3]" aria-hidden="true" /> <b>{naira(i.amount)}</b> to the official account</p>}
                </div>
                <button type="button" onClick={() => remove(i.id)} className="shrink-0 p-1.5 text-mist hover:text-white" aria-label={`Remove ${i.name}`}><X size={16} /></button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {valid.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-mist"><span>Paid {naira(total)}</span><span>Fee {naira(feeNaira)}</span></div>
          <div className="mt-1.5 h-2 w-full overflow-hidden bg-white/10">
            <motion.div className={`h-full ${total >= feeNaira ? "bg-[#7CE0A3]" : "bg-red"}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        </div>
      )}

      {!reading && valid.length > 0 && total < feeNaira && (
        <p className="mt-3 flex items-start gap-2 border border-[#FF6B76]/60 bg-[#E11E2D]/15 p-3 text-sm" role="alert">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#FF6B76]" aria-hidden="true" />
          <span>Your receipts add up to <b>{naira(total)}</b>, which is <b>{naira(feeNaira - total)} short</b> of the {naira(feeNaira)} fee. Transfer the remaining <b>{naira(feeNaira - total)}</b> to the official account and upload that receipt too.</span>
        </p>
      )}
      {!reading && invalid.length > 0 && (
        <p className="mt-3 flex items-start gap-2 text-xs text-[#FFB4B9]" role="alert"><TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Remove or replace the receipt marked in red to continue.</p>
      )}
      {ok && total > feeNaira && (
        <p className="mt-3 text-xs text-mist">You paid {naira(total - feeNaira)} more than the fee. Mention it on the form so the team can sort it out.</p>
      )}
    </div>
  );
}
