/*! @preserve
 * any-json
 *
 * Copyright 2017 Adam Voss, MIT license
 * Copyright 2015-2016 Christian Zangl, MIT license
 * Details and documentation:
 * https://github.com/laktak/any-json
 */

import * as cson from 'cson';
import csv = require('fast-csv');
import * as hjson from 'hjson';
import * as ini from 'ini';
import * as json5 from 'json5';
import * as toml from 'toml-j0.4';
import tomlify = require('tomlify-j0.4');
import * as util from 'util';
require('util.promisify/shim')();
import strip_json_comments = require('strip-json-comments');
import * as XLSX from 'xlsx';
import * as xml2js from 'xml2js';
import * as yaml from 'js-yaml';

interface FormatConversion {
  readonly name: string
  encode(value: any): Promise<string | Buffer>
  decode(text: string, reviver?: (key: any, value: any) => any): Promise<any>
}

class CsonConverter implements FormatConversion {
  readonly name: string = 'cson'

  public async encode(value: any) {
    return cson.stringify(value, undefined, 2)
  }

  public async decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return cson.parse(text, reviver)
  }
}

class CsvConverter implements FormatConversion {
  readonly name: string = 'csv'

  public encode(value: any) {
    return new Promise<string>((resolve, reject) => {
      if (Array.isArray(value)) {
        csv.writeToString(value, { headers: true }, function (err, result) {
          if (err) {
            reject(err);
          }
          else {
            resolve(result);
          }
        })
      }
      else {
        reject("CSV encoding requires the object be an array.")
      }
    })
  }

  public decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return new Promise((resolve, reject) => {
      const res: any[] = [];
      csv.fromString(text, { headers: true })
        .on("data", function (data) { res.push(data); })
        .on("end", function () { resolve(res); });
    });
  }
}

class HjsonConverter implements FormatConversion {
  readonly name: string = 'hjson'

  public async encode(value: any) {
    return hjson.stringify(value)
  }

  public async decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return hjson.parse(text)
  }
}

class IniConverter implements FormatConversion {
  readonly name: string = 'ini'

  private looksLikeArray(object: object): boolean {
    const areInts = Object.getOwnPropertyNames(object).every(s => /^\d+$/.test(s))
    if (!areInts) {
      return false
    }
    const ints = Object.getOwnPropertyNames(object).map(s => parseInt(s)).sort();
    return [...Array(ints.length)].every(i => i === ints[i])
  }

  public async encode(value: any) {
    return ini.stringify(value)
  }

  public async decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    const parsed = ini.parse(text)
    if (!this.looksLikeArray(parsed)) {
      return parsed
    }

    const array = Array(Object.getOwnPropertyNames(parsed).length)
    for (var index = 0; index < array.length; index++) {
      array[index] = parsed[index]
    }

    return array;
  }
}

class JsonConverter implements FormatConversion {
  readonly name: string = 'json'

  public async encode(value: any) {
    return JSON.stringify(value, null, 4)
  }

  public async decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return JSON.parse(strip_json_comments(text), reviver)
  }
}


class Json5Converter implements FormatConversion {
  readonly name: string = 'json5'

  public async encode(value: any) {
    return json5.stringify(value, null, 4)
  }

  public async decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return json5.parse(text, reviver)
  }
}

class TomlConverter implements FormatConversion {
  readonly name: string = 'toml'

  public async encode(value: any) {
    return tomlify.toToml(value, undefined);
  }

  public async decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return toml.parse(text)
  }
}

class XmlConverter implements FormatConversion {
  readonly name: string = 'xml'

  public async encode(value: any) {
    const builder = new xml2js.Builder();
    return builder.buildObject(value)
  }

  public decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return util.promisify(xml2js.parseString)(text)
  }
}

class YamlConverter implements FormatConversion {
  readonly name: string = 'yaml'

  public async encode(value: any) {
    return yaml.safeDump(value)
  }

  public async decode(text: string, reviver?: (key: any, value: any) => any): Promise<any> {
    return yaml.safeLoad(text)
  }
}

const codecs = new Map([
  new CsonConverter(),
  new CsvConverter(),
  new HjsonConverter(),
  new IniConverter(),
  new JsonConverter(),
  new Json5Converter(),
  new TomlConverter(),
  new XmlConverter(),
  new YamlConverter()
].map(c => [c.name, c] as [string, FormatConversion]))

export async function decode(text: string, format: string): Promise<any> {
  const codec = codecs.get(format)

  if (codec) {
    return codec.decode(text, undefined);
  }

  throw new Error("Unknown format " + format + "!");
}

export async function encode(value: any, format: string): Promise<string | Buffer> {
  const codec = codecs.get(format)

  if (codec) {
    return codec.encode(value);
  }

  throw new Error("Unknown format " + format + "!");
}