// Minimal controlled text input built on Ink's useInput (no extra deps).
// Supports masking (for passwords) and a placeholder.

import React from 'react';
import { Text, useInput } from 'ink';

const e = React.createElement;

export default function TextInput({
  value,
  onChange,
  onSubmit,
  mask,
  placeholder = '',
  focus = true,
}) {
  useInput(
    (input, key) => {
      if (key.return) {
        if (onSubmit) onSubmit(value);
        return;
      }
      if (key.backspace || key.delete) {
        onChange(value.slice(0, -1));
        return;
      }
      // Ignore control / navigation keys.
      if (
        key.ctrl ||
        key.meta ||
        key.escape ||
        key.tab ||
        key.upArrow ||
        key.downArrow ||
        key.leftArrow ||
        key.rightArrow
      ) {
        return;
      }
      if (input) onChange(value + input);
    },
    { isActive: focus }
  );

  const shown = value ? (mask ? mask.repeat(value.length) : value) : '';
  if (!value && placeholder) {
    return e(Text, { color: 'gray' }, placeholder + (focus ? '▌' : ''));
  }
  return e(Text, null, shown + (focus ? '▌' : ''));
}
