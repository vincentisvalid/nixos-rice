// Grouped checkbox list with a "Select all" row. Space toggles, Enter submits.
// Built on Ink's useInput (no extra deps).

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

const e = React.createElement;

export default function MultiSelect({
  groups,
  selected,        // Set of selected ids
  onToggle,        // (id) => void
  onToggleAll,     // () => void
  allSelected,     // bool
  onSubmit,
  focus = true,
}) {
  // Navigable rows: row 0 is "select all", then every app in order.
  const navItems = [{ kind: 'all' }];
  for (const g of groups) for (const a of g.apps) navItems.push({ kind: 'item', id: a.id });

  const [cursor, setCursor] = useState(0);

  useInput(
    (input, key) => {
      if (key.upArrow) setCursor((c) => (c - 1 + navItems.length) % navItems.length);
      else if (key.downArrow) setCursor((c) => (c + 1) % navItems.length);
      else if (input === ' ') {
        const cur = navItems[cursor];
        if (cur.kind === 'all') onToggleAll();
        else onToggle(cur.id);
      } else if (key.return) {
        onSubmit();
      }
    },
    { isActive: focus }
  );

  const checkbox = (on) => (on ? '[x]' : '[ ]');

  const rows = [];
  // Select-all row (nav index 0).
  rows.push(
    e(
      Text,
      { key: 'all', color: cursor === 0 ? 'cyan' : 'yellow', bold: true },
      `${cursor === 0 ? '❯ ' : '  '}${checkbox(allSelected)} Select all`
    )
  );

  let nav = 1;
  for (const g of groups) {
    rows.push(e(Text, { key: `h-${g.title}`, color: 'magenta', bold: true }, `  ${g.title}`));
    for (const a of g.apps) {
      const idx = nav++;
      const isCursor = cursor === idx;
      const on = selected.has(a.id);
      rows.push(
        e(
          Text,
          { key: a.id, color: isCursor ? 'cyan' : on ? 'green' : undefined },
          `${isCursor ? '❯ ' : '  '}${checkbox(on)} ${a.label}`
        )
      );
    }
  }

  return e(
    Box,
    { flexDirection: 'column' },
    ...rows,
    e(Text, { color: 'gray', marginTop: 1 }, '  ↑/↓ move · space toggle · enter continue')
  );
}
