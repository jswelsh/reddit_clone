import { Request, Response } from 'express'
import { Session } from "express-session";
import { Redis } from 'ioredis'

/* export type MyContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
  req: Request & {session: Express.Session};
  res: Response;
} */
export type MyContext = {
  req: Request & { session?: Session & { userId?: number } };
  res: Response;
  redis: Redis;
};

/* import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { Redis } from "ioredis";

export type MyContext = {
  req: Request & {
    session: Session & Partial<SessionData> & { UserID: number };
  };
  redis: Redis;
  res: Response;
}; */
// UserID -> as you wrote it  (userId, userid, etc...)