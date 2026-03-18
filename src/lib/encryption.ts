import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const getRawKey = () => process.env.VAULT_KEY || '12345678901234567890123456789012';
const KEY = crypto.createHash('sha256').update(String(getRawKey())).digest('base64').substring(0, 32);

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (encryptedData: string) => {
  const [ivHex, authTagHex, encryptedTextHex] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
