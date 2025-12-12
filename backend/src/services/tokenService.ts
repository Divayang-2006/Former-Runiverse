import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  id: string;
}

const getJwtSecret = (): string => env.jwtSecret();

export const signAccessToken = (userId: string, expiresIn?: SignOptions["expiresIn"]): string => {
  const secret = getJwtSecret();
  const tokenExpiresIn = expiresIn ?? (env.jwtExpiration() as SignOptions["expiresIn"]);
  return jwt.sign({ id: userId }, secret, { expiresIn: tokenExpiresIn });
};

export const verifyAccessToken = <T extends AccessTokenPayload = AccessTokenPayload>(token: string): T => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as T;
};
