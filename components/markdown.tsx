import Link from "next/link";
import React, { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const components: Partial<Components> = {
    // @ts-expect-error
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        // @ts-expect-error
        <pre
          {...props}
          className={`${className} text-sm w-full max-w-full overflow-x-auto bg-slate-900/80 border border-slate-600/50 p-4 rounded-lg mt-3 mb-3 font-mono`}
        >
          <code className={`${match[1]} text-gray-200`}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className} text-sm bg-slate-700/60 text-emerald-300 py-1 px-2 rounded font-mono border border-slate-600/30`}
          {...props}
        >
          {children}
        </code>
      );
    },
    ol: ({ node, children, ...props }) => {
      return (
        <ol
          className="list-decimal list-outside ml-6 space-y-2 my-4"
          {...props}
        >
          {children}
        </ol>
      );
    },
    li: ({ node, children, ...props }) => {
      return (
        <li className="py-1 text-gray-300 leading-relaxed" {...props}>
          {children}
        </li>
      );
    },
    ul: ({ node, children, ...props }) => {
      return (
        <ul className="list-disc list-outside ml-6 space-y-2 my-4" {...props}>
          {children}
        </ul>
      );
    },
    strong: ({ node, children, ...props }) => {
      return (
        <span className="font-bold text-white" {...props}>
          {children}
        </span>
      );
    },
    em: ({ node, children, ...props }) => {
      return (
        <span className="italic text-blue-300" {...props}>
          {children}
        </span>
      );
    },
    a: ({ node, children, ...props }) => {
      return (
        // @ts-expect-error
        <Link
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          target="_blank"
          rel="noreferrer"
          {...props}
        >
          {children}
        </Link>
      );
    },
    h1: ({ node, children, ...props }) => {
      return (
        <h1
          className="text-3xl font-bold text-white mt-8 mb-4 pb-2 border-b border-slate-600/50"
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }) => {
      return (
        <h2
          className="text-2xl font-bold text-white mt-7 mb-3 flex items-center gap-2"
          {...props}
        >
          <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-blue-400 rounded-full"></div>
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }) => {
      return (
        <h3
          className="text-xl font-semibold text-gray-100 mt-6 mb-3"
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ node, children, ...props }) => {
      return (
        <h4
          className="text-lg font-semibold text-gray-200 mt-5 mb-2"
          {...props}
        >
          {children}
        </h4>
      );
    },
    h5: ({ node, children, ...props }) => {
      return (
        <h5
          className="text-base font-semibold text-gray-300 mt-4 mb-2"
          {...props}
        >
          {children}
        </h5>
      );
    },
    h6: ({ node, children, ...props }) => {
      return (
        <h6
          className="text-sm font-semibold text-gray-400 mt-4 mb-2"
          {...props}
        >
          {children}
        </h6>
      );
    },
    p: ({ node, children, ...props }) => {
      return (
        <p className="text-gray-300 leading-relaxed mb-4 text-base" {...props}>
          {children}
        </p>
      );
    },
    blockquote: ({ node, children, ...props }) => {
      return (
        <blockquote
          className="border-l-4 border-blue-400 bg-slate-700/30 pl-4 py-2 my-4 italic text-gray-300"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    table: ({ node, children, ...props }) => {
      return (
        <div className="overflow-x-auto my-6">
          <table
            className="w-full border-collapse border border-slate-600 rounded-lg overflow-hidden"
            {...props}
          >
            {children}
          </table>
        </div>
      );
    },
    thead: ({ node, children, ...props }) => {
      return (
        <thead className="bg-slate-700/50" {...props}>
          {children}
        </thead>
      );
    },
    th: ({ node, children, ...props }) => {
      return (
        <th
          className="border border-slate-600 px-4 py-2 text-left font-semibold text-white"
          {...props}
        >
          {children}
        </th>
      );
    },
    td: ({ node, children, ...props }) => {
      return (
        <td
          className="border border-slate-600 px-4 py-2 text-gray-300"
          {...props}
        >
          {children}
        </td>
      );
    },
    hr: ({ node, ...props }) => {
      return (
        <hr
          className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent"
          {...props}
        />
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
