import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client      = new SecretsManagerClient({ region: process.env.AWS_REGION });
const SECRET_ID   = "sage/gemini-keys";
const DAILY_LIMIT = 1500;
const MAX_ERRORS  = 10;

let cachedKeys     = null;
let cacheExpiry    = 0;
let saveInProgress = false;
let pendingUpdates = [];

// ✅ In-memory cooldown map — survives restarts only within same process
const keyCooldowns = new Map(); // label → expiry timestamp (ms)

/* ── Load keys ───────────────────────────────────────────────────────────── */
async function loadKeys(force = false) {
  if (!force && cachedKeys && Date.now() < cacheExpiry) return cachedKeys;
  const res   = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
  cachedKeys  = JSON.parse(res.SecretString);
  cacheExpiry = Date.now() + 60_000;
  return cachedKeys;
}

/* ── Save keys ───────────────────────────────────────────────────────────── */
async function saveKeys(keys) {
  cachedKeys  = keys;
  cacheExpiry = Date.now() + 60_000;
  await client.send(
    new PutSecretValueCommand({
      SecretId:     SECRET_ID,
      SecretString: JSON.stringify(keys),
    })
  );
}

/* ── Serialize all mutations ─────────────────────────────────────────────── */
async function mutateKeys(updateFn) {
  return new Promise((resolve, reject) => {
    pendingUpdates.push({ updateFn, resolve, reject });
    if (!saveInProgress) drainQueue();
  });
}

async function drainQueue() {
  if (saveInProgress || pendingUpdates.length === 0) return;
  saveInProgress = true;
  while (pendingUpdates.length > 0) {
    const { updateFn, resolve, reject } = pendingUpdates.shift();
    try {
      const keys = await loadKeys(true);
      updateFn(keys);
      await saveKeys(keys);
      resolve();
    } catch (err) {
      reject(err);
    }
  }
  saveInProgress = false;
}

/* ── Reset counters if new day ───────────────────────────────────────────── */
function resetIfNewDay(k) {
  const now       = new Date();
  const lastReset = new Date(k.lastReset || 0);
  const sameDay   =
    now.getFullYear() === lastReset.getFullYear() &&
    now.getMonth()    === lastReset.getMonth()    &&
    now.getDate()     === lastReset.getDate();
  if (!sameDay) {
    k.usedToday  = 0;
    k.errorCount = 0;
    k.lastReset  = now.toISOString();
    // ✅ Also clear in-memory cooldown for this key on new day
    keyCooldowns.delete(k.label);
  }
  return k;
}

/* ── Get next available key (least recently used) ────────────────────────── */
export async function getNextApiKey() {
  const keys = await loadKeys();
  const now  = Date.now();

  const available = keys
    .map(resetIfNewDay)
    .filter(k => k.active !== false)
    .filter(k => (k.usedToday  || 0) < DAILY_LIMIT)
    .filter(k => (k.errorCount || 0) < MAX_ERRORS)
    .filter(k => (keyCooldowns.get(k.label) || 0) < now)  // skip cooling keys
    .sort((a, b) => new Date(a.lastUsed || 0) - new Date(b.lastUsed || 0));

  if (!available.length) {
    // Find soonest cooldown expiry for a helpful message
    const allCooldowns = [...keyCooldowns.entries()]
      .filter(([, expiry]) => expiry > now)
      .map(([, expiry]) => expiry);

    if (allCooldowns.length) {
      const waitSec = Math.ceil((Math.min(...allCooldowns) - now) / 1000);
      throw new Error(`All keys exhausted or on cooldown. Soonest available in ${waitSec}s`);
    }

    throw new Error("All Gemini API keys have hit their daily limit or max errors. Try tomorrow or add more keys.");
  }

  console.log(
    `🔑 Using key: ${available[0].label} | usedToday: ${available[0].usedToday} | errorCount: ${available[0].errorCount}`
  );
  return available[0];
}

/* ── Mark key as successfully used ──────────────────────────────────────── */
export async function markKeyUsed(label) {
  // Clear cooldown on success — key is working fine
  keyCooldowns.delete(label);

  await mutateKeys(keys => {
    const k = keys.find(x => x.label === label);
    if (!k) return;
    k.usedToday  = (k.usedToday  || 0) + 1;
    k.errorCount = 0;  // reset errors on success
    k.lastUsed   = new Date().toISOString();
  });
}

/* ── Mark key as failed ──────────────────────────────────────────────────── */
export async function markKeyFailed(label, isQuota = false) {
  // Quota errors → long cooldown (60s). Auth errors → permanent until reset.
  const cooldownMs = isQuota ? 65_000 : 0;
  if (cooldownMs > 0) {
    keyCooldowns.set(label, Date.now() + cooldownMs);
    console.warn(`⏳ Key ${label} on cooldown for ${cooldownMs / 1000}s`);
  }

  await mutateKeys(keys => {
    const k = keys.find(x => x.label === label);
    if (!k) return;
    k.errorCount = (k.errorCount || 0) + 1;
    k.lastUsed   = new Date().toISOString();
    console.warn(`⚠️  Key ${label} errorCount is now ${k.errorCount}/${MAX_ERRORS}`);
  });
}

/* ── Pool status (for admin UI) ──────────────────────────────────────────── */
export async function getKeyPoolStatus() {
  const keys = await loadKeys(true);
  const now  = Date.now();
  return keys.map(k => ({
    label:      k.label,
    active:     k.active !== false,
    usedToday:  k.usedToday  || 0,
    remaining:  Math.max(0, DAILY_LIMIT - (k.usedToday || 0)),
    errorCount: k.errorCount || 0,
    lastUsed:   k.lastUsed,
    onCooldown: (keyCooldowns.get(k.label) || 0) > now,
    cooldownEndsIn: Math.max(0, Math.ceil(((keyCooldowns.get(k.label) || 0) - now) / 1000)),
  }));
}

/* ── Add a new key ───────────────────────────────────────────────────────── */
export async function addKey(label, keyValue) {
  if (!keyValue?.startsWith("AIzaSy"))
    throw new Error("Invalid key format — must start with AIzaSy");
  await mutateKeys(keys => {
    if (keys.find(k => k.label === label))
      throw new Error("A key with this label already exists");
    keys.push({
      label,
      key:        keyValue.trim(),
      active:     true,
      usedToday:  0,
      errorCount: 0,
      lastUsed:   null,
      lastReset:  new Date().toISOString(),
    });
  });
}

/* ── Remove a key ────────────────────────────────────────────────────────── */
export async function removeKey(label) {
  keyCooldowns.delete(label);
  await mutateKeys(keys => {
    const idx = keys.findIndex(k => k.label === label);
    if (idx !== -1) keys.splice(idx, 1);
  });
}

/* ── Toggle key active/inactive ─────────────────────────────────────────── */
export async function toggleKey(label) {
  let newState;
  await mutateKeys(keys => {
    const k = keys.find(x => x.label === label);
    if (!k) throw new Error("Key not found");
    k.active = !k.active;
    newState = k.active;
  });
  return newState;
}

/* ── Reset all keys (emergency) ─────────────────────────────────────────── */
export async function resetAllKeys() {
  keyCooldowns.clear();
  await mutateKeys(keys => {
    keys.forEach(k => {
      k.usedToday  = 0;
      k.errorCount = 0;
      k.lastReset  = new Date().toISOString();
    });
  });
  console.log("✅ All keys reset");
}
