import type { ReactNode } from "react";

/**
 * Streaming-safe markdown: complete markers render; incomplete bold/fences
 * are treated as plain text so the bubble does not collapse mid-token.
 */

function softenIncompleteMarkdown(text: string) {
  let next = text;
  const fenceCount = (next.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) {
    next += "\n```";
  }
  const boldCount = (next.match(/\*\*/g) ?? []).length;
  if (boldCount % 2 === 1) {
    next = next.replace(/\*\*[^*]*$/, (chunk) => chunk.slice(2));
  }
  return next;
}

function renderInline(text: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[1]) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${index}`} className="font-semibold text-slate-900">
          {match[1]}
        </strong>,
      );
    } else if (match[2]) {
      nodes.push(
        <em key={`${keyPrefix}-i-${index}`} className="italic">
          {match[2]}
        </em>,
      );
    } else if (match[3]) {
      nodes.push(
        <code key={`${keyPrefix}-c-${index}`} className="rounded bg-slate-100 px-1 py-0.5 text-[0.8em]">
          {match[3]}
        </code>,
      );
    }
    last = match.index + match[0].length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string }
  | { type: "paragraph"; text: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("```")) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        body.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && (/^\s*[-*]\s+/.test(lines[index]) || /^\s*\d+\.\s+/.test(lines[index]))) {
        items.push(lines[index].replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const para: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !/^#{1,3}\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index])
    ) {
      para.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

export function StreamMarkdown({ text }: { text: string }) {
  const blocks = parseBlocks(softenIncompleteMarkdown(text));

  if (blocks.length === 0) {
    return <p className="whitespace-pre-wrap break-words text-sm leading-6">{text}</p>;
  }

  return (
    <div className="space-y-2 break-words text-sm leading-6 text-slate-800">
      {blocks.map((block, index) => {
        const key = `md-${index}`;
        if (block.type === "heading") {
          const className =
            block.level === 1
              ? "text-base font-semibold text-slate-900"
              : "text-sm font-semibold text-slate-900";
          return (
            <p key={key} className={className}>
              {renderInline(block.text, key)}
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={key} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "code") {
          return (
            <pre key={key} className="overflow-x-auto rounded bg-slate-100 p-2 text-xs text-slate-800">
              <code>{block.text}</code>
            </pre>
          );
        }
        return (
          <p key={key} className="whitespace-pre-wrap">
            {renderInline(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}

export { softenIncompleteMarkdown, parseBlocks };
