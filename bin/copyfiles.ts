#!/usr/bin/env node
import { ParseArgsConfig, parseArgs } from 'node:util';
import pkg from '../package.json' assert { type: 'json' };

const args = getArgs();

if (args.values.help) {
  printHelp();
  process.exit(0);
}

if (!args.values['expr-file'] && args.positionals.length < 1) {
  console.log('Must provide a jmespath expression.');
  process.exit(1);
}

if (args.values['expr-file']) {
} else {
}

function getArgs() {
  const config: ParseArgsConfig = {
    options: {
      compact: {
        type: 'boolean',
        short: 'c',
        default: false,
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
      filename: {
        type: 'string',
        short: 'f',
      },
      'expr-file': {
        type: 'string',
        short: 'e',
      },
    },
    allowPositionals: true,
  };

  return parseArgs(config);
}

function printHelp(): void {
  console.log(`
NAME:
jp - jp [<options>] <expression>

USAGE:
  jp [global options] command [command options] [arguments...]

VERSION:
  ${pkg.name}@${pkg.version}

OPTIONS:
  --compact, -c                Produce compact JSON output that omits nonessential whitespace.
  --filename value, -f value   Read input JSON from a file instead of stdin.
  --expr-file value, -e value  Read JMESPath expression from the specified file.
  --help, -h                   Show help
`);
}
