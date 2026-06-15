#!/usr/bin/env node
// Entry point: render the Ink wizard.

import React from 'react';
import { render } from 'ink';
import App from './ui/app.js';

if (!process.stdout.isTTY) {
  console.error('The nixos-rice installer needs an interactive terminal (TTY).');
  process.exit(1);
}

render(React.createElement(App));
