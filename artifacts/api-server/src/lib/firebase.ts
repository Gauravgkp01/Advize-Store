import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
function parsePrivateKey(raw: string | undefined): string {
  if (!raw) return "";
  // Remove surrounding quotes if accidentally included
  let key = raw.replace(/^["']|["']$/g, "").trim();
  // Replace literal \n (escaped in JSON/env) with real newlines
  key = key.replace(/\\n/g, "\n");
  // If the entire key is still one line (no newlines at all), rebuild PEM structure
  if (!key.includes("\n")) {
    key = key
      .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
      .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----\n");
    // Insert newlines every 64 chars inside the base64 body
    const header = "-----BEGIN PRIVATE KEY-----\n";
    const footer = "\n-----END PRIVATE KEY-----\n";
    const body = key.slice(header.length, key.length - footer.length);
    const chunked = body.match(/.{1,64}/g)?.join("\n") ?? body;
    key = header + chunked + footer;
  }
  return key;
}
const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required");
if (!clientEmail) throw new Error("FIREBASE_CLIENT_EMAIL is required");
if (!privateKey) throw new Error("FIREBASE_PRIVATE_KEY is required");
if (!storageBucket) throw new Error("FIREBASE_STORAGE_BUCKET is required");

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket,
  });
}

export const db = getFirestore();
export const bucket = getStorage().bucket();
export const auth = getAuth();
