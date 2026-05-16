import { useRef, useState } from "react";
import { CalendarPlus, Upload, CalendarDays, CheckCircle2, AlertCircle, FileText, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

function countIcsEvents(text: string): number {
  const matches = text.match(/BEGIN:VEVENT/gi);
  return matches ? matches.length : 0;
}

export function CalendarImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [eventCount, setEventCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const reset = () => {
    setFile(null);
    setContent("");
    setEventCount(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".ics")) {
      setStatus({ kind: "error", message: "Please upload a valid .ics file." });
      reset();
      return;
    }
    const text = await f.text();
    setFile(f);
    setContent(text);
    setEventCount(countIcsEvents(text));
    setStatus({ kind: "idle" });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const { error } = await supabase.from("calendars").insert({
      name: file.name,
      csv_content: content,
      event_count: eventCount,
    });
    setUploading(false);
    if (error) {
      setStatus({ kind: "error", message: "Upload failed. Please try again." });
      return;
    }
    setStatus({ kind: "success", message: "Calendar uploaded successfully." });
    reset();
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="rounded-3xl bg-card border border-border/60 p-6 sm:p-7 shadow-[var(--shadow-card)]">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Import TimeEdit Calendar
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Upload your TimeEdit .ics file to automatically organize your class photos.
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="flex gap-3 rounded-2xl bg-accent/60 border border-accent p-4 mb-5">
          <Upload className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-accent-foreground">
            Download your schedule from TimeEdit as an{" "}
            <span className="font-medium">.ics</span> calendar file before uploading.
          </p>
        </div>

        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          accept=".ics,text/calendar"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) acceptFile(f);
          }}
        />

        {/* File area */}
        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) acceptFile(f);
            }}
            className={cn(
              "group relative flex w-full items-center justify-center gap-2 rounded-2xl py-4 px-5 text-sm font-semibold text-primary-foreground transition-all duration-300 active:scale-[0.98]",
              "bg-[var(--gradient-primary)] shadow-[var(--shadow-button)] hover:shadow-[0_14px_30px_-10px_oklch(0.58_0.22_285/0.7)] hover:-translate-y-0.5 text-slate-800",
              dragOver && "ring-4 ring-primary/30 -translate-y-0.5",
            )}
          >
            <CalendarPlus className="h-5 w-5" />
            Add Calendar
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-3.5 animate-scale-in">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {eventCount} event{eventCount === 1 ? "" : "s"} · {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Upload button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 px-5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] disabled:active:scale-100",
            file && !uploading
              ? "bg-[var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-button)] hover:-translate-y-0.5"
              : "bg-secondary text-muted-foreground cursor-not-allowed",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Calendar
            </>
          )}
        </button>

        {/* Status */}
        {status.kind === "error" && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/20 bg-[var(--destructive-soft)] px-4 py-3 animate-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">{status.message}</p>
          </div>
        )}
        {status.kind === "success" && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[color:var(--success)]/20 bg-[var(--success-soft)] px-4 py-3 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--success)]" />
            <p className="text-sm font-medium text-[color:var(--success-foreground)]">
              {status.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
