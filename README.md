# Overview

This is a modern TypeScript implementation of the well-known [`copyfiles`](https://www.npmjs.com/package/copyfiles) package.

## Usage

```sh
npm install
npm run build

mkdir input/
mkdir input/other/
touch input/a.txt
touch input/other/b.txt

node dist/lib/bin/copyfiles.js input/**/*.txt output/ -V --flat
```

## Building

```sh
npm install
npm test
```