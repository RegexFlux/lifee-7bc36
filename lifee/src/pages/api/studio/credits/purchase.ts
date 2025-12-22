import type { NextApiRequest, NextApiResponse } from "next";
import { getStore } from "../_store";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const store = getStore();
    const body = req.body as { amount?: number };
    const amount = Number(body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).send("Invalid amount");

    store.credits += amount;
    return res.status(200).json({ credits: store.credits });
}
