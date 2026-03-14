import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { toast } from '../../lib/toast'

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-7">{children}</p>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-paw-info underline underline-offset-4 hover:text-blue-300"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-semibold text-paw-text">{children}</strong>,
        em: ({ children }) => <em className="italic text-paw-text">{children}</em>,
        ul: ({ children }) => <ul className="mb-3 list-disc space-y-2 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-2 pl-5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="text-paw-muted">{children}</li>,
        code: ({ className, children, ...props }) => {
          const inline = 'inline' in props ? Boolean(props.inline) : false
          const source = String(children).replace(/\n$/, '')
          const match = /language-(\w+)/.exec(className || '')

          if (inline || !match) {
            return <code className="rounded bg-paw-bg px-1.5 py-0.5 font-mono text-[12px] text-paw-text">{source}</code>
          }

          return <CodeBlock code={source} language={match[1]} />
        },
        table: ({ children }) => (
          <div className="mb-3 overflow-hidden rounded-xl border border-paw-border last:mb-0">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">{children}</table>
            </div>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-paw-bg text-paw-text">{children}</thead>,
        th: ({ children }) => <th className="border-b border-paw-border px-3 py-2 font-medium">{children}</th>,
        td: ({ children }) => <td className="border-b border-paw-border px-3 py-2 text-paw-muted last:border-b-0">{children}</td>,
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-paw-accent pl-4 italic text-paw-muted last:mb-0">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Code copied')
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy code')
    }
  }

  return (
    <div className="relative mb-3 overflow-hidden rounded-xl border border-paw-border last:mb-0">
      <button
        type="button"
        onClick={copyCode}
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white backdrop-blur transition-colors hover:bg-black/50"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      <SyntaxHighlighter
        language={language}
        style={atomOneDark}
        customStyle={{
          margin: 0,
          background: '#09090b',
          padding: '16px',
          fontSize: '12px',
          lineHeight: '1.6',
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
