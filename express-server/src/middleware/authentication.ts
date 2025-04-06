import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const supabaseToken = req.headers.authorization?.split("Bearer ")[1];
    if (!supabaseToken) {
      return res.status(401).json({ error: "No token provided" });
    }
    console.log("supabaseToken: ", supabaseToken);
    console.log("JTW_SECRET: ", process.env.JWT_SECRET);

    const decodedToken = jwt.verify(
      supabaseToken,
      process.env.JWT_SECRET as string,
    ) as any;

    console.log("Decoded token:", JSON.stringify(decodedToken, null, 2));

    req.body.userId = decodedToken.sub;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};
