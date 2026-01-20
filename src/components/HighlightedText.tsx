'use client';

import { ReactNode } from 'react';

interface HighlightedTextProps {
  children: string;
  highlightColor?: string;
}

export default function HighlightedText({
  children,
  highlightColor = '#4A9B4E', // squarage-green
}: HighlightedTextProps) {
  // Parse text and wrap /highlighted/ portions in styled spans
  const parseText = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    const regex = /\/([^/]+)\//g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the highlighted text
      parts.push(
        <span
          key={match.index}
          className="relative inline font-bold"
          style={{
            backgroundColor: highlightColor,
            color: '#FAF9F6', // cream background color
            padding: '0 4px',
            margin: '0 1px',
          }}
        >
          {match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return <>{parseText(children)}</>;
}
