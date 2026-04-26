import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "غير مصرح — يرجى تسجيل الدخول" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, email, name, role }
    next();
  } catch {
    return res.status(401).json({ error: "الجلسة منتهية — يرجى تسجيل الدخول مجدداً" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "صلاحيات المسؤول مطلوبة" });
  }
  next();
}
