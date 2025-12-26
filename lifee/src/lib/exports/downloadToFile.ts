// src/lib/exports/downloadToFile.ts
import fs from "fs";
import {pipeline} from "stream/promises";

export async function downloadToFile(url: string, outPath: string) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download failed: ${r.status}`);
    // @ts-ignore Node fetch body is a Readable
    await pipeline(r.body, fs.createWriteStream(outPath));
}
