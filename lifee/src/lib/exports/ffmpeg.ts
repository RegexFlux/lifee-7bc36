// src/lib/exports/ffmpeg.ts
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
 * Normalise chaque clip pour concat safe (même fps/size/audio).
 * - encode vidéo: h264
 * - audio: aac (ou silence si pas d’audio)
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
    const af = "aresample=48000";

    const r = await runCmd("ffmpeg", [
        "-y",
        "-i",
        inPath,
        "-vf",
        vf,
        "-af",
        af,
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

    if (r.code !== 0) throw new Error(`ffmpeg normalize failed: ${r.stderr || r.stdout}`);
}

export async function ffmpegConcatFromList(params: { listFilePath: string; outPath: string }) {
    const r = await runCmd("ffmpeg", [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        params.listFilePath,
        "-c",
        "copy",
        params.outPath,
    ]);
    if (r.code !== 0) throw new Error(`ffmpeg concat failed: ${r.stderr || r.stdout}`);
}

/**
 * Ajoute une musique (loop) et remplace l’audio (v1 simple).
 * - vidéo copiée
 * - audio = musique loopée + -shortest
 */
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
