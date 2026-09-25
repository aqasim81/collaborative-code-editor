export interface UserInfo {
  id: string;
  name: string;
  image: string | null;
  color: string;
}

/** The signed-in user as exposed by the web app session. */
export interface SessionUser {
  id: string;
  name: string;
  image: string | null;
}

/** Claims the web app puts in the Auth.js session JWT; the WS server verifies these. */
export interface AuthTokenClaims {
  id: string;
  name: string;
  picture?: string | null;
  iat: number;
  exp: number;
}
