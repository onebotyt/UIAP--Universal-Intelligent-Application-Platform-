import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  type?: string;
}

export function signToken(
  payload: TokenPayload,
  secret: string,
  expiresIn: string | number = '8h',
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}
