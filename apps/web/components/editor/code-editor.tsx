"use client";

import { Compartment } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";
import type { LanguageId } from "@/lib/languages";
import { loadLanguage } from "./extensions";

interface CodeEditorProps {
  language: LanguageId;
  initialDoc?: string;
}

// Let the editor take its parent's height and scroll internally.
const fullHeight = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { overflow: "auto" },
});

export function CodeEditor({ language, initialDoc = "" }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());

  // Create the view once; the language effect below reconfigures it in place.
  // biome-ignore lint/correctness/useExhaustiveDependencies: initialDoc only seeds a new view
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) {
      return;
    }
    const view = new EditorView({
      parent,
      doc: initialDoc,
      extensions: [basicSetup, oneDark, fullHeight, languageCompartment.current.of([])],
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

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
