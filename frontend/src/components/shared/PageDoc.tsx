import { useId, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface PageDocProps {
  /** マークダウン（見出しは ## / ### 推奨） */
  markdown: string;
  /** 要約行の左に付く短いラベル */
  title?: string;
  className?: string;
  defaultOpen?: boolean;
}

const mdClass =
  "max-w-none text-sm text-muted-foreground " +
  "[&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground " +
  "[&_h2]:first:mt-0 " +
  "[&_h3]:mt-3 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-foreground/95 " +
  "[&_p]:leading-relaxed " +
  "[&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:ml-4 [&_ol]:list-decimal " +
  "[&_code]:rounded [&_code]:bg-slate-800/80 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono " +
  "[&_a]:text-archon-400 [&_a]:underline " +
  "[&_table]:w-full [&_table]:text-left [&_th]:border-b [&_th]:p-1 [&_td]:border-b [&_td]:p-1 [&_td]:border-border/50";

/**
 * 各画面の「本（Book）」＋ マークダウン解説。`<details>` で畳み可能。
 */
export function PageDoc({ markdown, title = "この画面の説明", className, defaultOpen = true }: PageDocProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={cn("group mb-6 rounded-lg border border-border/80 bg-slate-900/40", className)}
      open={open}
      onToggle={(e) => {
        setOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:bg-slate-800/50 [&::-webkit-details-marker]:hidden"
        aria-describedby={id}
      >
        <BookOpen className="h-4 w-4 shrink-0 text-archon-400" aria-hidden />
        <span>{title}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div id={id} className={cn("border-t border-border/60 px-3 pb-3 pt-0", mdClass)}>
        <div className="pt-2">
          <ReactMarkdown
            components={{
              h2: ({ children }) => <h2>{children}</h2>,
              h3: ({ children }) => <h3>{children}</h3>,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </details>
  );
}
