#!/usr/bin/env node

import path from 'path';
import yargs from 'yargs';
import copyfiles, { CopyFilesOptions } from '../src/index.js';

const args = yargs(process.argv.slice(2)).options({
  a: {
    type: 'boolean',
    alias: 'all',
    describe: 'include files & directories beginning with a dot (.)',
    default: false,
  },
  e: {
    type: 'string',
    array: true,
    alias: 'exclude',
    describe: 'pattern or glob to exclude (multiple times)',
  },
  E: {
    type: 'boolean',
    alias: 'error',
    describe: 'throw error if nothing is copied',
    default: false,
  },
  f: {
    type: 'boolean',
    alias: 'flat',
    describe: 'flatten the output',
    default: false,
  },
  F: {
    type: 'boolean',
    alias: 'follow',
    describe: 'follow symbolic links',
    default: false,
  },
  s: {
    type: 'boolean',
    alias: 'soft',
    describe: 'do not overwrite destination files if they exist',
    default: false,
  },
  u: {
    alias: 'up',
    describe: 'slice a path off the bottom of the paths',
    default: 0,
  },
  V: {
    type: 'boolean',
    alias: 'verbose',
    describe: 'print more information to console',
    default: false,
  },
});
if (path.basename(process.argv[1]) === 'copyup') {
  args.default('u', 1);
}
const argv = args.parseSync();
if (argv.flat) {
  argv.up = true;
}
if (process.argv.length < 3) {
  args.showHelp();
  process.exit(1);
}

const options: CopyFilesOptions = {
  all: argv.a,
  error: argv.E,
  exclude: argv.e?.map(String),
  flat: argv.f,
  follow: argv.F,
  soft: argv.s,
  up: argv.up === true ? true : argv.u,
  verbose: argv.V,
};

copyfiles(argv._.map(String), options, err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
});
