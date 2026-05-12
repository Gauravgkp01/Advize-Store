import React from "react";

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

interface Props {
  text: string;
  className?: string;
}

export function DescriptionRenderer({ text, className = "" }: Props) {
  if (!text?.trim()) return null;

  const lines = text.split("\n");

  type Block =
    | { type: "bullet"; items: string[] }
    | { type: "paragraph"; content: string };

  const blocks: Block[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.match(/^[-•]\s+/)) {
      const content = line.replace(/^[-•]\s+/, "");
      const last = blocks[blocks.length - 1];
      if (last?.type === "bullet") {
        last.items.push(content);
      } else {
        blocks.push({ type: "bullet", items: [content] });
      }
      continue;
    }

    if (line.trim() === "") {
      continue;
    }

    const last = blocks[blocks.length - 1];
    if (last?.type === "paragraph") {
      last.content += " " + line.trim();
    } else {
      blocks.push({ type: "paragraph", content: line.trim() });
    }
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === "bullet") {
          return (
            <ul key={i} className="space-y-1.5 pl-0">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
}
