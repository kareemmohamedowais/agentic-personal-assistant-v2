import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db.js";

const router = Router();

// ─── JWT_SECRET validation ──────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set in environment variables");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = "7d";

// ─── Register ───────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = db
      .prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
      .run(email, hashed, name);

    const token = jwt.sign(
      { userId: result.lastInsertRowid, email, name, role: "user" },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES,
      }
    );

    res
      .status(201)
      .json({ token, user: { id: result.lastInsertRowid, email, name, role: "user" } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Login ──────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    }

    const user = db
      .prepare("SELECT id, email, name, password, role, is_active FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }

    // ─── Enforce is_active check ──────────────────────────────
    if (!user.is_active) {
      return res.status(403).json({ error: "هذا الحساب معطّل — تواصل مع المسؤول" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role || "user" },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES,
      }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role || "user" },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

