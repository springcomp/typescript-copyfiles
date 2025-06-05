# Overview

This is a modern TypeScript implementation of the well-known [`copyfiles`](https://www.npmjs.com/package/copyfiles) package.

## Usage

Command-line options:

```pre
Options:
     --help     Show help                                            [boolean]
     --version  Show version number                                  [boolean]
 -a, --all      include files & directories beginning with a dot (.) [boolean] [default: false]
 -e, --exclude  pattern or glob to exclude (multiple times)          [string]
 -E, --error    throw error if nothing is copied                     [boolean] [default: false]
 -f, --flat     flatten the output                                   [boolean] [default: false]
 -F, --follow   follow symbolic links                                [boolean] [default: false]
 -s, --soft     do not overwrite destination files if they exist     [boolean] [default: false]
 -u, --up       slice a path off the bottom of the paths             [default: 0]
 -V, --verbose  print more information to console                    [boolean] [default: false] 
```

## Running

```sh
npm install
npm run build

mkdir input/
mkdir input/other/
touch input/a.txt
touch input/other/b.txt

node dist/bin/copyfiles.js input/**/*.txt output/ -V --flat
```

## Building

```sh
npm install
npm test
```