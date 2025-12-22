import type { NextApiRequest, NextApiResponse } from "next";
import { getStore } from "../_store";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    const store = getStore();
    return res.status(200).json(store.musicPresets);
}
