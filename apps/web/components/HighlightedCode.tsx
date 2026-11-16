'use client';

import { useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/common';
import { Check, Copy } from 'lucide-react';

/** Only the extensions we expect artifacts or fenced blocks to use. */
const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  bash: 'bash',
  c: 'c',
  cc: 'cpp',
  cjs: 'javascript',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  cts: 'typescript',
  cxx: 'cpp',
  diff: 'diff',
  gql: 'graphql',
  go: 'go',
  graphql: 'graphql',
  h: 'c',
  hpp: 'cpp',
  htm: 'xml',
  html: 'xml',
  ini: 'ini',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsonc: 'json',
  jsx: 'javascript',
  kt: 'kotlin',
  kts: 'kotlin',
  less: 'less',
  lua: 'lua',
  md: 'markdown',
  markdown: 'markdown',
  mjs: 'javascript',
  mts: 'typescript',
  patch: 'diff',
  php: 'php',
  pl: 'perl',
  py: 'python',
  r: 'r',
  rb: 'ruby',
  rs: 'rust',
  scss: 'scss',
  sh: 'bash',
  sql: 'sql',
  svg: 'xml',
  swift: 'swift',
  toml: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  txt: 'plaintext',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  zsh: 'bash',
};

function languageFromFilename(filename?: string): string | undefined {
  const extension = filename?.split('.').pop()?.toLowerCase();
  return extension ? LANGUAGE_BY_EXTENSION[extension] : undefined;
}

type HighlightedCodeProps = {
  code: string;
  /** Artifact filename, used to infer the language when `language` is omitted. */
  filename?: string;
  /** Explicit language from a markdown fence (e.g. `ts`). */
  language?: string;
  /** Show a hover "copy" button — used for markdown fences, not the artifact viewer. */
  copyable?: boolean;
};

export const HighlightedCode = ({ code, filename, language, copyable }: HighlightedCodeProps) => {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => {
    const resolved = language ?? languageFromFilename(filename);
    if (resolved && hljs.getLanguage(resolved)) {
      return hljs.highlight(code, { language: resolved, ignoreIllegals: true }).value;
    }
    // Unknown extension or fence: let highlight.js pick. Its output is HTML-escaped,
    // so model-provided code is safe to inject below.
    return hljs.highlightAuto(code).value;
  }, [code, filename, language]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const block = (
    <pre className="syntax-block">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );

  if (!copyable) return block;

  return (
    <div className="group relative">
      {block}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute top-2 right-2 rounded-md p-1.5 text-white/70 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
};
