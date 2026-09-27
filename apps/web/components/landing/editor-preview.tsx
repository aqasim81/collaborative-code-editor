import { userColor } from "@collab-editor/shared";

// Fixed ids, so the preview's colours are the ones these two users would get in a real room.
const ADA = { name: "Ada", ...userColor("preview-ada") };
const LINUS = { name: "Linus", ...userColor("preview-linus") };

interface CaretProps {
  name: string;
  color: string;
}

function Caret({ name, color }: CaretProps) {
  return (
    <span
      className="relative inline-block h-[1.2em] w-0.5 align-text-bottom"
      style={{ background: color }}
    >
      <span
        className="absolute -top-5 left-0 rounded px-1 font-sans text-[10px] leading-4 text-white whitespace-nowrap"
        style={{ background: color }}
      >
        {name}
      </span>
    </span>
  );
}

/** A static picture of a shared editor: plain markup, no CodeMirror, hidden from assistive technology. */
export function EditorPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-border bg-neutral-950 text-neutral-200 shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-neutral-400">
        <span>debounce.ts</span>
        <span className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500" />2 editing
        </span>
      </div>
      <pre className="overflow-hidden px-4 pt-7 pb-4 font-mono text-[13px] leading-6">
        <code>
          <span className="text-purple-400">export function</span>{" "}
          <span className="text-sky-300">debounce</span>(fn, ms) {"{"}
          <Caret {...ADA} />
          {"\n"}
          {"  "}
          <span className="text-purple-400">let</span> timer;
          {"\n"}
          {"  "}
          <span className="text-purple-400">return</span> (...args) =&gt; {"{"}
          {"\n"}
          {"    "}clearTimeout(timer);{"\n"}
          {"    "}timer = setTimeout(() =&gt;{" "}
          <span style={{ background: LINUS.colorLight }}>fn(...args)</span>
          <Caret {...LINUS} />, ms);{"\n"}
          {"  "}
          {"}"};{"\n"}
          {"}"}
        </code>
      </pre>
    </div>
  );
}
