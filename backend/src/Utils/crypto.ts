import crypto from 'crypto';

const SECRET_KEY = process.env.SECRET_KEY as string;
const IV_LENGTH = 16;

export function encrypt(data: any): string {
    const json = JSON.stringify(data);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY!, 'utf8'), iv);
    let encrypted = cipher.update(json, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}

export function decrypt(encrypted: string): any {
    const [ivPart, encryptedPart] = encrypted.split(':');
    const iv = Buffer.from(ivPart, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY!, 'utf8'), iv);
    let decrypted = decipher.update(encryptedPart, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
}