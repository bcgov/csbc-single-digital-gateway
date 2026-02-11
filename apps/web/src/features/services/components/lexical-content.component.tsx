import type { JSX } from "react";

interface LexicalNode {
  type: string;
  tag?: string;
  text?: string;
  format?: number;
  listType?: string;
  children?: LexicalNode[];
}

interface LexicalContentProps {
  content: Record<string, unknown>;
}

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 8;

function renderTextFormat(text: string, format: number): JSX.Element | string {
  let result: JSX.Element | string = text;
  if (format & FORMAT_BOLD) result = <strong>{result}</strong>;
  if (format & FORMAT_ITALIC) result = <em>{result}</em>;
  if (format & FORMAT_UNDERLINE) result = <u>{result}</u>;
  return result;
}

function renderNode(node: LexicalNode, index: number): JSX.Element | string | null {
  switch (node.type) {
    case "root":
      return <>{node.children?.map(renderNode)}</>;

    case "heading": {
      const Tag = (node.tag ?? "h2") as keyof JSX.IntrinsicElements;
      return (
        <Tag key={index} className="text-lg font-semibold">
          {node.children?.map(renderNode)}
        </Tag>
      );
    }

    case "list": {
      const Tag = node.listType === "number" ? "ol" : "ul";
      return (
        <Tag key={index} className="list-inside pl-2" style={{ listStyleType: node.listType === "number" ? "decimal" : "disc" }}>
          {node.children?.map(renderNode)}
        </Tag>
      );
    }

    case "paragraph":
      return <p key={index}>{node.children?.map(renderNode)}</p>;

    case "listitem":
      return <li key={index}>{node.children?.map(renderNode)}</li>;

    case "text":
      return (
        <span key={index}>
          {node.format ? renderTextFormat(node.text ?? "", node.format) : node.text}
        </span>
      );

    default:
      return null;
  }
}

export function LexicalContent({ content }: LexicalContentProps) {
  const root = content?.root as LexicalNode | undefined;
  if (!root) return null;
  return <div className="flex flex-col gap-3">{renderNode(root, 0)}</div>;
}
