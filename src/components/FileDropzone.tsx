import { useRef, useState, type DragEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
  fileName?: string | null;
}

export default function FileDropzone({ onFile, disabled, fileName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed border-slate-800" : dragOver ? "border-emerald-500 bg-emerald-500/5" : "border-slate-700 hover:border-slate-600"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <p className="text-3xl mb-2">📄</p>
      {fileName ? (
        <p className="text-sm font-medium text-slate-200">{fileName}</p>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-200">PDF oder Textdatei hierher ziehen oder klicken</p>
          <p className="text-xs text-slate-500 mt-1">PDF oder .txt, max. ca. 15.000 Zeichen</p>
        </>
      )}
    </div>
  );
}
