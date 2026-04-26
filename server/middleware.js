import jwt from "jsonwebtoken";
import db from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET;

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "غير مصرح — يرجى تسجيل الدخول" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // ─── Enforce is_active check ──────────────────────────────
    const user = db.prepare("SELECT is_active FROM users WHERE id = ?").get(payload.userId);
    if (!user || !user.is_active) {
      return res.status(403).json({ error: "هذا الحساب معطّل — تواصل مع المسؤول" });
    }
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

