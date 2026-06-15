// Tiny braille spinner (no extra deps).

import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

const e = React.createElement;
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export default function Spinner({ color = 'cyan' }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80);
    return () => clearInterval(t);
  }, []);
  return e(Text, { color }, FRAMES[frame]);
}
