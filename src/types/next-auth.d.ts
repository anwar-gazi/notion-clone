import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    loginAt?: number | null; // epoch ms
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    loginAt?: number;
  }
}
