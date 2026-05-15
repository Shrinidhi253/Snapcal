import { useRef, useState } from "react";
import { CalendarPlus, FileSpreadsheet, Upload, X, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function countCsvRows(text: string): number {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return Math.max(0, lines.length - 1); // minus header
}

export function CalendarImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<string>("");
  const [eventCount, setEventCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a .csv file exported from TimeEdit.");
      return;
    }
    const text = await f.text();
    setFile(f);
    setContent(text);
    setEventCount(countCsvRows(text));
  };

  const reset = () => {
    setFile(null);
    setContent("");
    setEventCount(0);
    if (inputRef.current) inputRef.current.value = "";
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
      toast.error("Upload failed: " + error.message);
      return;
    }
    toast.success(`Calendar "${file.name}" saved with ${eventCount} events.`);
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <Button size="lg" onClick={() => setOpen(true)} className="gap-2">
        <CalendarPlus className="h-5 w-5" />
        Add calendar
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" />
              Import your TimeEdit schedule
            </CardTitle>
            <CardDescription>
              Upload your class schedule so Snapcal can group your photos by lesson.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => { reset(); setOpen(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Export your schedule as a .csv file</AlertTitle>
          <AlertDescription>
            In TimeEdit, open your schedule and choose <strong>Subscribe / Export</strong>, then
            pick the <strong>CSV</strong> format. Save the file to your device and upload it below.
          </AlertDescription>
        </Alert>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:bg-muted/60"
          >
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">Choose a .csv file</span>
            <span className="text-sm text-muted-foreground">Only .csv files are accepted</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {eventCount} event{eventCount === 1 ? "" : "s"} detected · {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              Change
            </Button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); setOpen(false); }}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading} className="gap-2">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
