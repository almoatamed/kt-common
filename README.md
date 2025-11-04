# kt-common

A compact TypeScript/JavaScript utility library providing a collection of useful helpers for Node.js and Bun environments. It includes helpers for formatting, paths, JSON manipulation, math, async locking, file downloading, and more.

## 📦 Installation

npm install kt-common async-lock axios  

# or  

yarn add kt-common async-lock axios  

## 🚀 Usage

import * as kt from "kt-common";  
// or import specific utilities  
import { clip, dashDateFormatter, downloadFile } from "kt-common";  

## 🧩 API Reference

```ts
numberToI32Hex(10); // "0000000a"  
numberToI32Hex(0xFFFFFFFF); // "ffffffff"  

dashDateFormatter(new Date(), { getDate: true, getTime: true, dateFormat: "yyyy-mm-dd" }); // "2025-11-04 09:05:03"  

const data = loadJson("./config.json");  

type BasicTypes = boolean | number | string | null | undefined;  
type RecursiveReadable = BasicTypes | { [key: string]: RecursiveReadable } | RecursiveReadable[];  
type JSONObject = { [key: string]: RecursiveReadable };  
type Merge<T, U> = T & Omit<U, keyof T>;  
type OmitFunctions<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>;  
type NestedType<EndType> = EndType | NestedType<EndType>[];  
type SearchBase = { search?: string; skip?: number; take?: number };  
type RemoveNull<T> = T extends null ? never : T;  

surfaceNestedType([1, [2, [3, 4], 5], 6]); // [1, 2, 3, 4, 5, 6]  

compareShallowRecord({ a: 1, b: 2 }, { a: 1, b: 2 }); // true  
compareShallowRecord({ b: 2, a: 1 }, { a: 1, b: 2 }); // false  

isBun(); // true if running in Bun  

resolveTs("src/main.ts"); // "src/main.js"  

const critical = async (x: number) => x * 2;  
const locked = lockMethod(critical, { lockName: "my-lock" });  
await Promise.all([locked(1), locked(2)]); // Executes sequentially  

resolvePath("./file.txt", "file:///home/user/"); // "/home/user/file.txt"  

await downloadFile({ method: "GET", url: "<https://example.com/image.png>", outputPath: "/tmp/image.png" });  

clip("hello world", 8); // "hello..."  

recursiveSelect("a.b.c", { a: { b: { c: 5 } } }); // 5  

padId(42); // "#0000000042"  

math.fixed(1.2345, 2); // 1.23  
math.min([1, 3, NaN, 2]); // 1  
math.max([1, 3, 2, NaN]); // 3  

cap("hello world from kt-common"); // "Hello World From Kt-Common"  

notEmptyValues({ a: 1, b: null, c: 0 }); // [1, 0]  

isNumber(3); // true  
isNumber("4.5"); // true  
isNumber("abc"); // false  

readVolatileJSON("./config.json", { createIfNotExists: true, defaultValue: { foo: "bar" } });  

await sleep(500);  
console.log("0.5s later");  

selectRandom([1, 2, 3, 4]); // e.g., 3  

trimSlashes("/foo/bar/"); // "foo/bar"  
trimSlashes("/"); // "/"  

import {
  dashDateFormatter,
  numberToI32Hex,
  downloadFile,
  clip,
  padId,
  math,
  sleep,
  selectRandom,
  surfaceNestedType
} from "kt-common";

async function demo() {
  console.log("hex:", numberToI32Hex(255)); // "000000ff"
  console.log(dashDateFormatter(new Date(), { getDate: true, getTime: true, dateFormat: "yyyy-mm-dd" }));
  console.log("clip:", clip("this is a long text", 10)); // "this i..."
  console.log("padId:", padId(42)); // "#0000000042"
  console.log("math.max:", math.max([1, 5, 3])); // 5
  console.log("flattened:", surfaceNestedType([1, [2, [3]], 4])); // [1,2,3,4]
}
```
