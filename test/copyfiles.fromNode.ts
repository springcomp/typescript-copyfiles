import test from 'tape';
import fs from 'fs';
import { glob } from 'glob';
import { mkdirp } from 'mkdirp';
import { rimraf } from 'rimraf';
import copyfiles, { CopyFilesOptions } from '../src/index.js';

function mkdirpAsync(p: string) {
  return mkdirp(p);
}

function after(t: test.Test) {
  rimraf('output').then(() => rimraf('input').then(() => t.end()));
}

function before(t: test.Test) {
  mkdirpAsync('input/other').then(() => t.end());
}

test('normal', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js', 'c');
    copyfiles(['input/*.txt', 'output'], err => {
      t.error(err, 'copyfiles');
      fs.readdir('output/input', (err, files) => {
        t.error(err, 'readdir');
        t.deepEquals(files.sort(), ['a.txt', 'b.txt'], 'correct number of things');
        t.end();
      });
    });
  });
  t.test('teardown', after);
});

test('modes', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/a.txt', 'a', { mode: 0o100755 });
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js', 'c');
    copyfiles(['input/*.txt', 'output'], err => {
      t.error(err, 'copyfiles');
      fs.readdir('output/input', (err, files) => {
        t.error(err, 'readdir');
        t.deepEquals(files.sort(), ['a.txt', 'b.txt'], 'correct number of things');
        t.equals(fs.statSync('output/input/a.txt').mode & 0o777, 0o755, 'correct mode');
        t.end();
      });
    });
  });
  t.test('teardown', after);
});

test('exclude', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js.txt', 'c');
    fs.writeFileSync('input/d.ps.txt', 'd');
    const options: CopyFilesOptions = {
      exclude: ['**/*.js.txt', '**/*.ps.txt'],
    };
    copyfiles(['input/*.txt', 'output'], options, err => {
      t.error(err, 'copyfiles');
      fs.readdir('output/input', (err, files) => {
        t.error(err, 'readdir');
        t.deepEquals(files.sort(), ['a.txt', 'b.txt'], 'correct number of things');
        t.end();
      });
    });
  });
  t.test('teardown', after);
});

test('all', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/.c.txt', 'c');
    copyfiles(['input/*.txt', 'output'], { all: true }, err => {
      t.error(err, 'copyfiles');
      fs.readdir('output/input', (err, files) => {
        t.error(err, 'readdir');
        t.deepEquals(files.sort(), ['.c.txt', 'a.txt', 'b.txt'], 'correct number of things');
        t.end();
      });
    });
  });
  t.test('teardown', after);
});

test('error on nothing copied', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/.c.txt', 'c');
    copyfiles(['input/*.txt', 'output'], { error: true }, err => {
      t.ok(err, 'should error');
      t.end();
    });
  });
  t.test('teardown', after);
});

test('soft', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    mkdirpAsync('output/input/other').then(() => {
      fs.writeFileSync('input/a.txt', 'inputA');
      fs.writeFileSync('output/input/a.txt', 'outputA');
      t.equal(fs.readFileSync('output/input/a.txt').toString(), 'outputA');
      fs.writeFileSync('input/b.txt', 'b');
      fs.writeFileSync('input/other/c.txt', 'inputC');
      fs.writeFileSync('output/input/other/c.txt', 'outputC');
      fs.writeFileSync('input/other/d.txt', 'd');
      copyfiles(['input/**/*.txt', 'output'], { soft: true }, err => {
        t.error(err, 'copyfiles');
        fs.readdir('output/input', (err, files) => {
          t.error(err, 'readdir');
          t.deepEquals(files.sort(), ['a.txt', 'b.txt', 'other'], 'correct number of things');
          t.equal(fs.readFileSync('output/input/a.txt').toString(), 'outputA');
          t.equal(fs.readFileSync('output/input/b.txt').toString(), 'b');
          t.equal(fs.readFileSync('output/input/other/c.txt').toString(), 'outputC');
          t.end();
        });
      });
    });
  });
  t.test('teardown', after);
});

test('with up', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/c.js', 'c');
    copyfiles(['input/*.txt', 'output'], { up: 1 }, err => {
      t.error(err, 'copyfiles');
      fs.readdir('output', (err, files) => {
        t.error(err, 'readdir');
        t.deepEquals(files.sort(), ['a.txt', 'b.txt'], 'correct number of things');
        t.end();
      });
    });
  });
  t.test('teardown', after);
});

test('with up 2', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/other/a.txt', 'a');
    fs.writeFileSync('input/other/b.txt', 'b');
    fs.writeFileSync('input/other/c.js', 'c');
    copyfiles(['input/**/*.txt', 'output'], { up: 2 }, err => {
      t.error(err, 'copyfiles');
      fs.readdir('output', (err, files) => {
        t.error(err, 'readdir');
        t.deepEquals(files.sort(), ['a.txt', 'b.txt'], 'correct number of things');
        t.end();
      });
    });
  });
  t.test('teardown', after);
});

test('flatten', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.writeFileSync('input/other/a.txt', 'a');
    fs.writeFileSync('input/b.txt', 'b');
    fs.writeFileSync('input/other/c.js', 'c');
    copyfiles(['input/**/*.txt', 'output'], { flat: true, up: true }, err => {
      t.error(err, 'copyfiles');
      fs.readdir('output', (err, files) => {
        t.error(err, 'readdir');
        t.deepEquals(files.sort(), ['a.txt', 'b.txt'], 'correct number of things');
        t.end();
      });
    });
  });
  t.test('teardown', after);
});

test('follow', t => {
  t.test('setup', before);
  t.test('copy stuff', t => {
    fs.mkdirSync('input/origin', { recursive: true });
    fs.mkdirSync('input/origin/inner', { recursive: true });
    fs.writeFileSync('input/origin/inner/a.txt', 'a');
    if (!fs.existsSync('input/dest')) {
      fs.symlinkSync('origin', 'input/dest');
    }
    copyfiles(['input/**/*.txt', 'output'], { up: 1, follow: true }, err => {
      t.error(err, 'copyfiles');
      glob('output/**/*.txt').then(files => {
        t.deepEquals(
          files.map(f => f.replace(/\\/g, '/')).sort(),
          ['output/dest/inner/a.txt', 'output/origin/inner/a.txt'],
          'correct number of things',
        );
        t.end();
      });
    });
  });
  t.test('teardown', after);
});
