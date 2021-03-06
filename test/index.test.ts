import "mocha"
import * as anyjson from '../lib'
import * as fs from 'fs'
import promisify = require('util.promisify');
const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
import * as path from 'path'
import * as chai from 'chai'

const assert = chai.assert;

suite('safe-formats', () => {

  const safe_formats = [
    "cson",
    "hjson",
    "json",
    "json5",
    "yaml"
  ]

  testEncode(safe_formats);
  testDecode(safe_formats);
});

suite('problematic-formats', () => {

  const problematic_formats = [
    "ini",
    //"xml" // Decoding the XML does not work: https://github.com/Leonidas-from-XIV/node-xml2js/issues/393
  ]

  testEncode(problematic_formats.concat(["xml"]));
  testDecode(problematic_formats);

  // TOML does not support top-level arrays.
  suite('toml', () => {
    test('encode', async () => {
      const format = "toml"
      const input = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'in', 'product.json'), 'utf8'));
      const actual = anyjson.encode(input, format);
      fs.writeFileSync(path.join(__dirname, 'fixtures', 'out', `product.${format}`), await actual, 'utf8');
      const expected = readFile(path.join(__dirname, 'fixtures', 'out', `product.${format}`), 'utf8');
      return assert.strictEqual(await actual, await expected)
    })

    test('decode', async () => {
      const format = "toml";
      const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'in', 'product.json'), 'utf8'));
      const contents = await readFile(path.join(__dirname, 'fixtures', 'out', 'product.' + format), 'utf8')
      const actual = await anyjson.decode(contents, format);
      return assert.deepEqual(actual, expected)
    })
  })
});

suite('tabular-formats', () => {

  const tabular_formats = [
    "csv",
    // "xls",
    // "xlsx"
  ]

  testEncode(tabular_formats);
  testDecode(tabular_formats);
});

function testEncode(formats: string[]) {
  suite('encode', function () {
    suite('product-set', () => {
      const input = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'in', 'product-set.json'), 'utf8'));

      for (const format of formats) {
        test(format, async function () {
          const actual = anyjson.encode(input, format)
          const expected = readFile(path.join(__dirname, 'fixtures', 'out', `product-set.${format}`), 'utf8')
          return assert.strictEqual(await actual, await expected)
        })
      }
    });
  });
};

function testDecode(formats: string[]) {
  suite('decode', function () {
    suite('product-set', () => {

      for (const format of formats) {
        test(format, async function () {
          const expected = await getExpectedJson(format)
          const contents = await readFile(path.join(__dirname, 'fixtures', 'out', 'product-set.' + format), 'utf8')
          const actual = await anyjson.decode(contents, format);
          return assert.deepEqual(actual, expected)
        })
      }
    });
  });
}

async function getExpectedJson(format: string) {
  const specializedPath = path.join(__dirname, 'fixtures', 'in', `product-set.${format}.json`);
  if (fs.existsSync(specializedPath)) {
    return JSON.parse(fs.readFileSync(specializedPath, 'utf8'));
  } else {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'in', 'product-set.json'), 'utf8'));
  }
}