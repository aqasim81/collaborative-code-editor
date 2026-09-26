"use client";

import { Compartment } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";
import type * as Y from "yjs";
import type { LanguageId } from "@/lib/languages";
import { loadLanguage } from "./extensions";
import { collaborativeSetup } from "./setup";

interface CodeEditorProps {
  language: LanguageId;
  /** The room's shared text; the editor never holds document state of its own (Invariant 3). */
  text: Y.Text;
}

// Let the editor take its parent's height and scroll internally.
const fullHeight = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
});

export function CodeEditor({ language, text }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());

  // One view per shared text; the language effect below reconfigures it in place.
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) {
      return;
    }
    const view = new EditorView({
      parent,
      doc: text.toString(),
      extensions: [
        collaborativeSetup(text),
        oneDark,
        fullHeight,
        languageCompartment.current.of([]),
      ],
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [text]);

  useEffect(() => {
    let cancelled = false;
    loadLanguage(language).then(
      (support) => {
        // A later selection or an unmount supersedes this load.
        if (cancelled || !viewRef.current) {
          return;
        }
        viewRef.current.dispatch({
          effects: languageCompartment.current.reconfigure(support),
        });
      },
      () => {
        // A failed grammar download leaves the editor usable as plain text.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [language]);

  return <div ref={containerRef} data-testid="code-editor" className="h-full min-h-0" />;
}
