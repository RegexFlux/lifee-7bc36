// src/lib/auth/viewer.ts
import crypto from "crypto";
import type {NextApiRequest, NextApiResponse} from "next";
import {and, eq, gt, isNull} from "drizzle-orm";

import {db} from "@/lib/db";
import {authSessions, users} from "@/lib/db/schema";

import {DEMO_START_CREDITS, LIFEe_SESSION_COOKIE, makeGuestEmail} from "./constants";
import {getCookie, getDemoCookie, setDemoCookie, setSessionCookie} from "./cookies";
import {randomToken, sha256Base64Url, signValue, verifySignedValue} from "./crypto";
