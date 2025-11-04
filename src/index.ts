// oxlint-disable no-async-promise-executor
import AsyncLock from "async-lock";
import fs from "fs";
import path from "path";
import URL from "url";
import axios from "axios";

export const numberToI32Hex = (number: number) => number.toString(16).slice(-8).padStart(8, "0");

export type BatcherOptions = {
    periodInMs: number;
};

export function dashDateFormatter(
    date: Date | string | null | undefined,
    config: {
        getDate?: boolean;
        getTime?: boolean;
        getMilliseconds?: boolean;
        rtl?: boolean;
        dateFormat?: "mm-yyyy" | "yyyy-mm" | "yyyy-mm-dd";
    } = {
        dateFormat: "yyyy-mm-dd",
        getDate: true,
        getMilliseconds: false,
        getTime: true,
        rtl: false,
    }
): string {
    if (!date) {
        return "";
    }
    let { dateFormat, getDate, getMilliseconds, getTime, rtl } = config;
    if (config.dateFormat === undefined) {
        dateFormat = "yyyy-mm-dd";
    }

    if (config.getDate === undefined) {
        getDate = true;
    }
    if (config.getTime === undefined) {
        getTime = true;
    }
    if (config.rtl === undefined) {
        rtl = false;
    }
    if (config.getMilliseconds == undefined) {
        getMilliseconds = false;
    }

    date = new Date(date);
    const month = padDate(String(date.getMonth() + 1));
    const dayOfMonth = padDate(String(date.getDate()));
    const fullYear = date.getFullYear();
    const hour = padDate(String(date.getHours()));
    const minutes = padDate(String(date.getMinutes()));
    const seconds = padDate(String(date.getSeconds()));
    const milliseconds = padDate(String(date.getMilliseconds()), 3);
    let timeString = `${hour}:${minutes}:${seconds}`;
    if (getMilliseconds) {
        timeString += "." + milliseconds;
    }

    let dateString: string;
    if (dateFormat === "mm-yyyy") {
        dateString = `${month}-${fullYear}`;
    } else if (dateFormat === "yyyy-mm") {
        dateString = `${fullYear}-${month}`;
    } else {
        dateString = `${fullYear}-${month}-${dayOfMonth}`;
    }

    if (getDate && getTime) {
        return rtl ? `${timeString} ${dateString}` : `${dateString} ${timeString}`;
    } else if (getDate && !getTime) {
        return dateString;
    } else {
        return timeString;
    }
}

export const loadJson = (jsonPath: fs.PathOrFileDescriptor) => {
    let json = fs.readFileSync(jsonPath, "utf-8");
    json = json
        .split("\n")
        .filter((line) => {
            return !line.match(/^\s*?\/\//);
        })
        .join("\n");
    json = json.replaceAll(/\/\*(.|\n)*?\*\//g, "");
    json = json.replaceAll(/,((\s|\n)*?(?:\}|\]))/g, "$1");
    json = JSON.parse(json);
    return json;
};

export type BasicTypes = boolean | number | string | null | undefined;
export type RecursiveReadable =
    | BasicTypes
    | {
          [key: string]: RecursiveReadable;
      }
    | RecursiveReadable[];
export type JSONObject = {
    [key: string]: RecursiveReadable;
};

export type Merge<T, U> = T & Omit<U, keyof T>;

export type OmitFunctions<T> = Pick<
    T,
    {
        [K in keyof T]: T[K] extends Function ? never : K;
    }[keyof T]
>;

export type NestedType<EndType> = EndType | ListNestedType<EndType>;
type ListNestedType<EndType> = NestedType<EndType>[];

export type ShallowObject = {
    [key: string]: BasicTypes | undefined;
};

export const compareShallowRecord = (a: ShallowObject, b: ShallowObject) => {
    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);
    if (aEntries.length != bEntries.length) {
        return false;
    }
    for (let i = 0; i < aEntries.length; i++) {
        const aEntry = aEntries[i];
        const bEntry = bEntries[i];
        if (aEntry[0] != bEntry[0] || aEntry[1] != bEntry[1]) {
            return false;
        }
    }

    return true;
};

export const isBun = () => {
    try {
        // @ts-ignore
        return !!Bun;
    } catch {
        return false;
    }
};

export const surfaceNestedType = <EndType>(nested: NestedType<EndType>[], _Root = true, _List: EndType[] = []) => {
    if (_Root) {
        _List = [];
    }

    for (const item of nested) {
        if (Array.isArray(item)) {
            surfaceNestedType(item, false, _List);
        } else {
            _List.push(item);
        }
    }

    return _List;
};

export const resolveTs = (path: string) => {
    if (path.endsWith(".ts")) {
        path = path.replace(/\.ts$/, ".js");
    }
    return path;
};

const lock = new AsyncLock({ maxExecutionTime: 5e3 });

type ArgumentsExtract<T> = T extends (...args: infer R) => any ? R : never;

export type UnwrapPromise<P> = P extends Promise<infer R> ? R : P;

export const lockMethod = function <T extends (...args: any[]) => any>(
    method: T,
    {
        lockName,
        lockTimeout = 1e4,
    }: {
        lockName: string;
        lockTimeout?: number;
    }
): (...args: ArgumentsExtract<T>) => Promise<UnwrapPromise<ReturnType<T>>> {
    const originalMethod = method;
    return async function (...args: any[]) {
        return new Promise(async (resolve, reject) => {
            try {
                await lock.acquire(
                    lockName,
                    async () => {
                        try {
                            return resolve(await originalMethod(...args));
                        } catch (error: any) {
                            reject(error);
                        }
                    },
                    {
                        timeout: lockTimeout,
                    }
                );
            } catch (error: any) {
                reject(error);
            }
        });
    };
};

export function resolvePath(relativePath: string, baseUrl: string) {
    return URL.fileURLToPath(new URL.URL(relativePath, baseUrl));
}

export const relativeToAbsolutePath = resolvePath;

export async function downloadFile({
    method,
    outputPath,
    url,
    body,
    query,
}: {
    url: string;
    method: string;
    outputPath: string;
    query?: any;
    body?: any;
}): Promise<boolean> {
    const writer = fs.createWriteStream(outputPath);
    const ax = axios;
    const response = await ax({
        method: method,
        url: url,
        params: query,
        data: body,
        responseType: "stream",
    });

    return new Promise((resolve, reject): any => {
        response.data.pipe(writer);
        let error: any = null;
        writer.on("error", (err) => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on("close", () => {
            if (!error) {
                resolve(true);
            }
        });
    });
}

export function clip(text: string, maxLength: number): string {
    if (maxLength < 3) {
        throw new Error("maxLength cannot be less than 3");
    }
    if (!text) {
        return "";
    }
    if (text.length > maxLength) {
        return `${text.slice(0, maxLength - 3)}...`;
    } else {
        return text;
    }
}

export function recursiveSelect(selector: string | Array<string>, obj: any): any {
    if (typeof selector == "string") {
        selector = selector.split(".").filter((s) => !!s);
    }

    if (!selector || !selector.length) {
        return obj;
    }
    try {
        return recursiveSelect(selector.slice(1), obj[selector[0]]);
    } catch {
        return undefined;
    }
}

function padId(id: string | number): string {
    return "#" + String(id).padStart(10, "0");
}
export { padId };

function fixed(value: string | number | null | undefined, n = 2) {
    return Number(Number(value).toFixed(n));
}

const math = {
    fixed,
    ceil: fixed,
    min: (arr: Array<number>): number => Math.min(...arr.filter((el) => !Number.isNaN(Number(el)))),
    max: (arr: Array<number>): number => Math.max(...arr.filter((el) => !Number.isNaN(Number(el)))),
};
export { math };

function cap(str: string) {
    return str.replaceAll(/\b\w+\b/gi, (match) => {
        const string = match;
        return string.charAt(0).toUpperCase() + string.slice(1);
    });
}
export { cap };

export type SearchBase = {
    search?: string;
    skip?: number;
    take?: number;
};

export type RemoveNull<T> = T extends null ? never : T;

export const notEmptyValues = <T extends { [key: symbol | number | string]: any }>(
    target?: T | null
): T extends { [key: string | symbol | number]: infer R } ? RemoveNull<R>[] : any[] => {
    if (!target) {
        return [] as any;
    }
    const values = Object.values(target).filter((i) => i !== undefined && i !== null);
    return values as any;
};

export const isNumber = function (num: any): num is number {
    if (typeof num === "number") {
        return num - num === 0;
    }
    if (typeof num === "string" && num.trim() !== "") {
        return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
    }
    return false;
};

export const readVolatileJSON = <T extends RecursiveReadable = any>(
    fullPath: string,
    options?:
        | {
              createIfNotExists: false;
          }
        | {
              createIfNotExists: true;
              defaultValue: T;
          }
): T | null => {
    try {
        if (!fs.existsSync(fullPath)) {
            if (options?.createIfNotExists && options?.defaultValue) {
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, JSON.stringify(options.defaultValue, null, 4));
                return options.defaultValue;
            }
            return null;
        }
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            return null;
        }
        return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
        return null;
    }
};

const padStart = (string: string, targetLength: number, padString: string): string => {
    targetLength = targetLength >> 0;
    string = String(string);
    padString = String(padString);

    if (string.length > targetLength) {
        return String(string);
    }

    targetLength = targetLength - string.length;

    if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length);
    }

    return padString.slice(0, targetLength) + String(string);
};

const padDate = (n: string, length = 2) => padStart(n, length, "0");

export async function sleep(time = 1000): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
export function selectRandom<T>(arr: T[]): T {
    return arr[Math.floor(arr.length * Math.random())];
}

export const trimSlashes = (path: string) =>
    path == "/"
        ? path
        : path
              .split("/")
              .filter((x) => x)
              .join("/");
