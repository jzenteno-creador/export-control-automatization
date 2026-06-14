"use client";

import { useState } from "react";
import { lookupKeyAnnotation, lookupArrayElementAnnotation } from "@/lib/annotations";

/* eslint-disable @typescript-eslint/no-explicit-any */

function AnnotationBadge({ note }: { note: { warn?: boolean; text: string } | null }) {
  if (!note) return null;
  return (
    <span className={`ml-2 not-mono text-[11px] italic ${note.warn ? "text-rose-600" : "text-slate-500"}`}>
      {note.warn && <span aria-hidden="true">⚠ </span>}{note.text}
    </span>
  );
}

function JsonNode({ value, name, canonicalPath, depth, defaultOpen, qualifierAnno }: {
  value: any; name?: string | number; canonicalPath: string; depth: number; defaultOpen?: boolean;
  qualifierAnno?: { qualifier: string; text: string } | null;
}) {
  const [open, setOpen] = useState(depth < 2 || !!defaultOpen);
  const keyAnno = canonicalPath ? lookupKeyAnnotation(canonicalPath) : null;

  if (value === null) {
    return (
      <div className="leading-snug">
        {name !== undefined && <span className="text-slate-700">{JSON.stringify(name)}: </span>}
        <span className="text-slate-400 italic">null</span>
        <AnnotationBadge note={keyAnno} />
      </div>
    );
  }
  if (typeof value !== "object") {
    const display = typeof value === "string" ? JSON.stringify(value) : String(value);
    return (
      <div className="leading-snug">
        {name !== undefined && <span className="text-slate-700">{JSON.stringify(name)}: </span>}
        <span className={typeof value === "string" ? "text-emerald-700" : "text-blue-700"}>{display}</span>
        <AnnotationBadge note={keyAnno} />
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string | number, any][] = isArray ? value.map((v: any, i: number) => [i, v]) : Object.entries(value);
  const empty = entries.length === 0;
  const summary = isArray ? `[${entries.length}]` : `{${entries.length}}`;

  return (
    <div className="leading-snug">
      <button onClick={() => setOpen(o => !o)} className="text-left hover:bg-slate-100 rounded px-0.5">
        <span className="text-slate-400 inline-block w-3">{empty ? "" : open ? "▾" : "▸"}</span>
        {name !== undefined && <span className="text-slate-700">{typeof name === "number" ? `[${name}]` : JSON.stringify(name)}: </span>}
        <span className="text-slate-500 text-xs">{isArray ? "Array" : "Object"} {summary}</span>
      </button>
      {qualifierAnno && (
        <span className="ml-2 not-mono text-[11px] italic font-medium text-blue-700">
          ← {qualifierAnno.qualifier}: {qualifierAnno.text}
        </span>
      )}
      <AnnotationBadge note={keyAnno} />
      {!empty && open && (
        <div className="ml-4 border-l border-slate-200 pl-3">
          {entries.map(([k, v]) => {
            const childCanonical = isArray
              ? (canonicalPath ? `${canonicalPath.replace(/\[\]$/, "")}[]` : "[]")
              : (canonicalPath ? `${canonicalPath}.${k}` : String(k));
            let childQualAnno = null;
            if (isArray) {
              const arrPath = canonicalPath ? `${canonicalPath}[]` : "[]";
              childQualAnno = lookupArrayElementAnnotation(arrPath, v);
            }
            return (
              <JsonNode key={k} name={k} value={v} canonicalPath={childCanonical} depth={depth + 1} qualifierAnno={childQualAnno} />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AnnotatedJsonTab({ payload }: { payload: any }) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">JSON con anotaciones</h3>
        <div className="text-xs text-slate-500">
          <span className="text-rose-600">⚠</span> = advertencia ·{" "}
          <span className="italic">cursiva gris</span> = anotación informativa ·{" "}
          <span className="italic font-medium text-blue-700">azul</span> = qualifier reconocido
        </div>
      </div>
      <div className="mono text-xs bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto scrollbar-thin">
        <JsonNode value={payload} canonicalPath="" depth={0} defaultOpen={true} />
      </div>
    </div>
  );
}
