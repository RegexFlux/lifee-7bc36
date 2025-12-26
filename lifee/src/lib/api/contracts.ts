// File: src/lib/api/contracts.ts
import {z} from "zod";

export const ViewerUserSchema = z.object({
    id: z.string(),
    email: z.email(),
    type: z.enum(["guest", "user"]), // si tu ajoutes d'autres types plus tard, on l'étend ici
    credits: z.number().int(),
    createdAt: z.union([z.string(), z.date()]),
});

export const ViewerSchema = z.object({
    user: ViewerUserSchema,
    sessionId: z.string(),
    isNewUser: z.boolean().optional(),
    isNewSession: z.boolean().optional(),
});

export type ViewerDTO = z.infer<typeof ViewerSchema>;
