import React from "react";

const LTR_MATH_RUN = /\(?[A-Za-z0-9](?:[A-Za-z0-9+\-*/=().·×÷^√≤≥≠ ]*[A-Za-z0-9)])?/g;

export function BidiText({ text }: { text: string }): React.ReactElement {
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let keyIdx = 0;

  LTR_MATH_RUN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LTR_MATH_RUN.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    nodes.push(
      <span key={keyIdx++} dir="ltr">
        {match[0]}
      </span>,
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return <>{nodes}</>;
}
