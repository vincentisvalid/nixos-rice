// Minimal arrow-key list selector built on Ink's useInput (no extra deps).
// items: [{ label, value }]. Calls onSelect(item) on Enter.

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const e = React.createElement;

export default function Select({ items, onSelect, focus = true }) {
  const [index, setIndex] = useState(0);

  useInput(
    (input, key) => {
      if (items.length === 0) return;
      if (key.upArrow) setIndex((i) => (i - 1 + items.length) % items.length);
      else if (key.downArrow) setIndex((i) => (i + 1) % items.length);
      else if (key.return) onSelect(items[index]);
    },
    { isActive: focus }
  );

  if (items.length === 0) {
    return e(Text, { color: 'red' }, 'No options available.');
  }

  return e(
    Box,
    { flexDirection: 'column' },
    items.map((it, i) =>
      e(
        Text,
        { key: it.value ?? i, color: i === index ? 'cyan' : undefined },
        (i === index ? '❯ ' : '  ') + it.label
      )
    )
  );
}
