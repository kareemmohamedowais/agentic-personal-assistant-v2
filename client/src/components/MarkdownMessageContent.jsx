import { memo, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import CodeBlock from "./CodeBlock";

const MATH_MARKERS_REGEX = /(\$\$[\s\S]+?\$\$)|((^|[^\\])\$[^\n$]+\$)|(\\\([^\n]+\\\))|(\\\[[\s\S]+?\\\])|(\\begin\{(?:equation|align|gather|multline)\})/m;

function decodeEscapes(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function normalizeQuotedPromptBlock(input) {
  const text = String(input || "");
  const fenced = text.match(/^```(\w+)?\n([\s\S]*?)\n```\s*$/);
  const source = fenced ? fenced[2] : text;

  if (!/system_prompt\s*=\s*\(/.test(source)) return null;

  const lines = source.split(/\r?\n/);
  let collecting = false;
  const parts = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!collecting && /system_prompt\s*=\s*\(/.test(line)) {
      collecting = true;
      continue;
    }
    if (!collecting) continue;
    if (line === ")" || line === "),") break;

    const m = line.match(/^(?:[rubfRUBF]+)?"([\s\S]*)"\s*[+,]?\s*$/);
    if (!m) continue;
    parts.push(decodeEscapes(m[1]));
  }

  if (parts.length < 2) return null;
  return parts.join("\n").trim();
}

function normalizeMessageText(input) {
  const text = String(input || "");

  const cleanedPrompt = normalizeQuotedPromptBlock(text);
  if (cleanedPrompt) {
    return `\`\`\`text\n${cleanedPrompt}\n\`\`\``;
  }

  // Handle double-quoted escaped payloads: "line1\\nline2"
  if (
    text.length > 3 &&
    text.startsWith('"') &&
    text.endsWith('"') &&
    /\\n|\\"/.test(text)
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return decodeEscapes(text.slice(1, -1));
    }
  }

  return text;
}

function ensureKatexStylesheet() {
  if (typeof document === "undefined") return;
  if (document.getElementById("katex-stylesheet")) return;

  const link = document.createElement("link");
  link.id = "katex-stylesheet";
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
  document.head.appendChild(link);
}

function MarkdownMessageContent({ text }) {
  const normalizedText = useMemo(() => normalizeMessageText(text), [text]);
  const hasMath = useMemo(() => MATH_MARKERS_REGEX.test(normalizedText || ""), [normalizedText]);
  const [mathPlugins, setMathPlugins] = useState({
    remarkMathPlugin: null,
    rehypeKatexPlugin: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!hasMath) {
      setMathPlugins({ remarkMathPlugin: null, rehypeKatexPlugin: null });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const [{ default: remarkMathPlugin }, { default: rehypeKatexPlugin }] = await Promise.all([
        import("remark-math"),
        import("rehype-katex"),
      ]);

      if (cancelled) return;
      ensureKatexStylesheet();
      setMathPlugins({ remarkMathPlugin, rehypeKatexPlugin });
    })().catch(() => {
      if (!cancelled) {
        setMathPlugins({ remarkMathPlugin: null, rehypeKatexPlugin: null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [hasMath]);

  const remarkPlugins = mathPlugins.remarkMathPlugin
    ? [remarkGfm, mathPlugins.remarkMathPlugin]
    : [remarkGfm];
  const rehypePlugins = mathPlugins.rehypeKatexPlugin ? [mathPlugins.rehypeKatexPlugin] : [];

  return (
    <div
      className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#0a0b10] prose-pre:rounded-2xl prose-pre:border prose-pre:border-white/5 prose-a:text-[var(--teal)] hover:prose-a:text-[var(--gold)] prose-strong:text-[var(--gold)] prose-strong:font-bold"
      style={{ direction: "rtl", textAlign: "right", fontFamily: "var(--font-body)" }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          pre: ({ children }) => (
            <div className="not-prose my-5 w-full shadow-2xl" dir="ltr">
              {children}
            </div>
          ),
          code({ inline, className, children, ...props }) {
            if (!inline) {
              return (
                <CodeBlock className={className} {...props}>
                  {children}
                </CodeBlock>
              );
            }
            return (
              <code
                className="rounded-lg px-2 py-1 text-[0.85em] font-mono mx-1"
                dir="ltr"
                style={{
                  background: "rgba(212,168,83,0.1)",
                  color: "var(--gold-light)",
                  border: "1px solid rgba(212,168,83,0.15)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          ul: ({ children }) => <ul className="list-disc pr-6 space-y-2 my-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pr-6 space-y-2 my-4">{children}</ol>,
          h1: ({ children }) => (
            <h1
              className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-white/5 gradient-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-white" style={{ fontFamily: "var(--font-display)" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mt-4 mb-2 text-(--gold)" style={{ fontFamily: "var(--font-display)" }}>
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className="border-r-4 py-2 pr-5 pl-3 my-4 italic rounded-l-2xl glass-subtle text-indigo-200/80"
              style={{ borderColor: "var(--gold)" }}
            >
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 decoration-current transition-colors text-(--teal) hover:text-white font-medium"
            >
              {children} <ExternalLink className="inline w-3 h-3 mb-1 opacity-50" />
            </a>
          ),
        }}
      >
        {normalizedText}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownMessageContent);
