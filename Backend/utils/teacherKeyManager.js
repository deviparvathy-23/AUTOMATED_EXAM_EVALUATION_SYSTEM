import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
  CreateSecretCommand,
  DeleteSecretCommand,
} from "@aws-sdk/client-secrets-manager";
import Teacher from "../models/Teacher.js";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

// ── Save teacher key to AWS + store ref in Teacher document ──
export async function saveTeacherKey(teacherId, provider, keyValue) {
  const secretId = `sage/teacher/${teacherId}/${provider}`;

  try {
    await client.send(new PutSecretValueCommand({
      SecretId:     secretId,
      SecretString: keyValue,
    }));
    console.log(`✅ Updated existing secret: ${secretId}`);
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      await client.send(new CreateSecretCommand({
        Name:         secretId,
        SecretString: keyValue,
      }));
      console.log(`✅ Created new secret: ${secretId}`);
    } else {
      console.error("❌ AWS Secrets Manager error:", err);
      throw err;
    }
  }

  // teacherId from JWT is the MongoDB _id
  const updated = await Teacher.findByIdAndUpdate(
    teacherId,
    { [`apiKeyRefs.${provider}`]: secretId },
    { new: true }
  );

  if (!updated) {
    console.error(`❌ Teacher not found in MongoDB for _id: ${teacherId}`);
    throw new Error(`Teacher not found: ${teacherId}`);
  }

  console.log(`✅ Teacher apiKeyRefs updated in MongoDB for ${teacherId}`);
}

// ── Get actual key from AWS ──
export async function getTeacherKey(teacherId, provider) {
  const teacher = await Teacher.findById(teacherId).select("apiKeyRefs");

  if (!teacher) {
    console.warn(`⚠️ Teacher not found for _id: ${teacherId}`);
    return null;
  }

  const secretId = teacher?.apiKeyRefs?.[provider];
  if (!secretId) {
    console.warn(`⚠️ No ${provider} key ref found for teacher: ${teacherId}`);
    return null;
  }

  try {
    const res = await client.send(new GetSecretValueCommand({
      SecretId: secretId,
    }));
    return res.SecretString;
  } catch (err) {
    console.error(`❌ Failed to fetch secret ${secretId}:`, err);
    return null;
  }
}

// ── Delete key from AWS + clear ref in Teacher document ──
export async function deleteTeacherKey(teacherId, provider) {
  const teacher  = await Teacher.findById(teacherId).select("apiKeyRefs");
  const secretId = teacher?.apiKeyRefs?.[provider];

  if (secretId) {
    try {
      await client.send(new DeleteSecretCommand({
        SecretId:                   secretId,
        ForceDeleteWithoutRecovery: true,
      }));
      console.log(`✅ Deleted secret: ${secretId}`);
    } catch (err) {
      console.error(`❌ Failed to delete secret ${secretId}:`, err);
      throw err;
    }
  } else {
    console.warn(`⚠️ No secret to delete for teacher: ${teacherId}, provider: ${provider}`);
  }

  await Teacher.findByIdAndUpdate(
    teacherId,
    { [`apiKeyRefs.${provider}`]: null }
  );

  console.log(`✅ Cleared apiKeyRefs.${provider} in MongoDB for ${teacherId}`);
}

// ── Get which providers are configured (true/false only, never the key) ──
export async function getTeacherKeyStatus(teacherId) {
  const teacher = await Teacher.findById(teacherId).select("apiKeyRefs");

  if (!teacher) {
    console.warn(`⚠️ Teacher not found for _id: ${teacherId}`);
    return {};
  }

  const status = {};
  for (const [provider, ref] of Object.entries(teacher?.apiKeyRefs || {})) {
    status[provider] = !!ref;
  }

  console.log(`✅ Key status for ${teacherId}:`, status);
  return status;
}