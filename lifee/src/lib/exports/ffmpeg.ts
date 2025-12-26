// File: src/lib/exports/ffmpeg.ts
import {spawn} from "child_process";

export function runCmd(cmd: string, args: string[], opts?: { cwd?: string }) {
    return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
        const p = spawn(cmd, args, {stdio: ["ignore", "pipe", "pipe"], cwd: opts?.cwd});
        let stdout = "";
        let stderr = "";
        p.stdout.on("data", (d) => (stdout += d.toString()));
        p.stderr.on("data", (d) => (stderr += d.toString()));
        p.on("error", reject);
        p.on("close", (code) => resolve({code: code ?? 0, stdout, stderr}));
    });
}

export async function ffprobeDurationSec(inputPath: string) {
    const r = await runCmd("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        inputPath,
    ]);
    if (r.code !== 0) throw new Error(`ffprobe failed: ${r.stderr || r.stdout}`);
    const sec = Number(String(r.stdout).trim());
    if (!Number.isFinite(sec) || sec <= 0) throw new Error("ffprobe invalid duration");
    return sec;
}

/**
 * Concat N clips AVEC transitions (xfade + acrossfade).
 * Prérequis: tous les clips ont même résolution/fps et audio présent (silence ok).
 */
export async function ffmpegConcatWithTransitions(params: {
    clipPaths: string[];
    durationsSec: number[]; // même ordre que clipPaths
    outPath: string;
    transitionSec: number; // ex 0.35
}) {
    const {clipPaths, durationsSec, outPath} = params;
    const n = clipPaths.length;
    if (n < 2) throw new Error("Need at least 2 clips for transitions");
    if (durationsSec.length !== n) throw new Error("durationsSec length mismatch");

    const t = Math.max(0.05, Math.min(params.transitionSec, 2.0));

    // garde-fou : chaque clip doit être > transition + marge
    for (let i = 0; i < n; i++) {
        if (durationsSec[i] <= t + 0.1) {
            throw new Error(`Clip too short for transition (idx=${i} dur=${durationsSec[i].toFixed(2)}s)`);
        }
    }

    // Offsets cumulés (overlap)
    // xfade offset = (sum(durations[0..i-1]) - t*i)
    const offsets: number[] = [];
    let sum = durationsSec[0];
    for (let i = 1; i < n; i++) {
        offsets[i] = sum - t * i;
        sum += durationsSec[i];
    }

    const inputs = clipPaths.flatMap((p) => ["-i", p]);

    const parts: string[] = [];

    // reset PTS
    for (let i = 0; i < n; i++) {
        parts.push(`[${i}:v]setpts=PTS-STARTPTS[v${i}]`);
        parts.push(`[${i}:a]asetpts=PTS-STARTPTS[a${i}]`);
    }

    // chain xfade + acrossfade
    let vPrev = `v0`;
    let aPrev = `a0`;
    for (let i = 1; i < n; i++) {
        const vOut = i === n - 1 ? "vout" : `v${i}x`;
        const aOut = i === n - 1 ? "aout" : `a${i}x`;

        const off = offsets[i];
        parts.push(`[${vPrev}][v${i}]xfade=transition=fade:duration=${t}:offset=${off.toFixed(4)}[${vOut}]`);
        parts.push(`[${aPrev}][a${i}]acrossfade=d=${t}:c1=tri:c2=tri[${aOut}]`);

        vPrev = vOut;
        aPrev = aOut;
    }

    const filterComplex = parts.join(";");

    const r = await runCmd("ffmpeg", [
        "-y",
        ...inputs,
        "-filter_complex",
        filterComplex,
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        outPath,
    ]);

    if (r.code !== 0) throw new Error(`ffmpeg transitions failed: ${r.stderr || r.stdout}`);
}

export async function ffprobeHasAudio(inputPath: string) {
    const r = await runCmd("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        inputPath,
    ]);
    if (r.code !== 0) return false;
    return String(r.stdout).trim().length > 0;
}

/**
 * Normalise n'importe quel input (video AVEC ou SANS audio) -> mp4 h264+aac (audio silence si absent).
 */
export async function ffmpegNormalizeClip(params: {
    inPath: string;
    outPath: string;
    width: number;
    height: number;
    fps: number;
}) {
    const {inPath, outPath, width, height, fps} = params;

    const vf = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fps=${fps}`;
    const hasAudio = await ffprobeHasAudio(inPath);

    const common = ["-y", "-i", inPath, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20"];

    const r = hasAudio
        ? await runCmd("ffmpeg", [
            ...common,
            "-af",
            "aresample=48000",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            outPath,
        ])
        : await runCmd("ffmpeg", [
            "-y",
            "-i",
            inPath,
            "-f",
            "lavfi",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-vf",
            vf,
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            outPath,
        ]);

    if (r.code !== 0) throw new Error(`ffmpeg normalize failed: ${r.stderr || r.stdout}`);
}

/**
 * Image (jpg/png/webp) -> clip MP4 h264+aac, duration fix, Ken Burns léger + audio silence.
 */
export async function ffmpegImageToClip(params: {
    imagePath: string;
    outPath: string;
    width: number;
    height: number;
    fps: number;
    durationSec: number;
}) {
    const {imagePath, outPath, width, height, fps, durationSec} = params;

    const frames = Math.max(1, Math.round(durationSec * fps));
    const base = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
    const zoom = `zoompan=z='1.0+0.0009*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}`;
    const vf = `${base},${zoom},format=yuv420p,fps=${fps}`;

    const r = await runCmd("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-t",
        String(durationSec),
        "-i",
        imagePath,
        "-f",
        "lavfi",
        "-t",
        String(durationSec),
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-vf",
        vf,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        outPath,
    ]);

    if (r.code !== 0) throw new Error(`ffmpeg image->clip failed: ${r.stderr || r.stdout}`);
}

export async function ffmpegConcatFromList(params: { listFilePath: string; outPath: string }) {
    const r = await runCmd("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", params.listFilePath, "-c", "copy", params.outPath]);
    if (r.code !== 0) throw new Error(`ffmpeg concat failed: ${r.stderr || r.stdout}`);
}

export async function ffmpegAddMusic(params: { videoIn: string; musicIn: string; outPath: string }) {
    const r = await runCmd("ffmpeg", [
        "-y",
        "-i",
        params.videoIn,
        "-stream_loop",
        "-1",
        "-i",
        params.musicIn,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        params.outPath,
    ]);
    if (r.code !== 0) throw new Error(`ffmpeg music failed: ${r.stderr || r.stdout}`);
}
