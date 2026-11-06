const clientOrigin = process.env.NEXT_PUBLIC_CLIENT_URL || "http://127.0.0.1:3001";
export const clientHome = new URL("/community/home", clientOrigin).href;
