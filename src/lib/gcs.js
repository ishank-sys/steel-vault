import { Storage } from '@google-cloud/storage';

let storage = null;

export function getGCSStorage() {
  if (storage) return storage;

  // Support a single JSON credentials env var (raw JSON or base64) for Vercel
  let credentials = null;
  const rawCredJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GCS_CREDENTIALS_JSON;
  if (rawCredJson) {
    try {
      // Try parse raw JSON first
      credentials = JSON.parse(rawCredJson);
    } catch (e) {
      try {
        // Try base64 decode then parse
        const decoded = Buffer.from(rawCredJson, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
      } catch (e2) {
        // ignore and fall back to individual env vars
        credentials = null;
      }
    }
  }

  if (!credentials) {
    // Create credentials object from individual environment variables
    credentials = {
      type: "service_account",
      project_id: process.env.GCS_PROJECT_ID,
      private_key_id: process.env.GCS_PRIVATE_KEY_ID,
      private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GCS_CLIENT_EMAIL,
      client_id: process.env.GCS_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.GCS_CLIENT_X509_CERT_URL,
      universe_domain: "googleapis.com"
    };
  }

  // Validate credentials: require private_key, client_email, project_id
  const missing = [];
  if (!credentials.private_key) missing.push('private_key');
  if (!credentials.client_email) missing.push('client_email');
  if (!credentials.project_id) missing.push('project_id');
  if (missing.length) {
    throw new Error(`GCS credentials incomplete, missing: ${missing.join(', ')}. Provide full JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON or set GCS_PRIVATE_KEY, GCS_CLIENT_EMAIL and GCS_PROJECT_ID.`);
  }

  storage = new Storage({
    projectId: credentials.project_id || process.env.GCS_PROJECT_ID,
    credentials: credentials
  });

  return storage;
}