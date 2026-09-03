import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Check, Copy } from 'lucide-react';

const CodeBlock = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-white/10 bg-black/60 shadow-lg group">
      <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/10 text-xs text-gray-400">
        <span className="font-mono text-[11px] uppercase tracking-wider text-purple-400">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-gray-200 overflow-x-auto leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
};

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  return (
    <div className="markdown-content text-sm leading-relaxed text-gray-200 space-y-2.5">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-purple-300 mt-3 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-purple-400 mt-2 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-gray-200 font-normal">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 pl-2 text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 pl-2 text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed marker:text-purple-400">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500 bg-purple-500/10 px-4 py-2 my-2.5 rounded-r-xl text-gray-300 italic">
              {children}
            </blockquote>
          ),
          code: ({ inline, className, children, ...props }) => {
            if (inline || !String(children).includes('\n')) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md bg-white/10 text-purple-300 font-mono text-xs border border-white/10"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-white/10">
              <table className="w-full text-xs text-left text-gray-300">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/10 text-purple-300 uppercase font-semibold text-[11px] border-b border-white/10">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-white/5">{children}</td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          a: ({ href, children }) => {
            const isSafeUrl = typeof href === 'string' && (
              href.startsWith('https://') ||
              href.startsWith('http://') ||
              href.startsWith('mailto:') ||
              href.startsWith('#') ||
              href.startsWith('/')
            );
            const safeHref = isSafeUrl ? href : '#';

            return (
              <a
                href={safeHref}
                target={safeHref.startsWith('http') ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
