import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("app.db");

async function testLogin(email, plainPassword) {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    console.log(`❌ User ${email} not found`);
    return;
  }

  const match = await bcrypt.compare(plainPassword, user.password);
  console.log(`🔍 Testing ${email}:`);
  console.log(`   - Hashed in DB: ${user.password}`);
  console.log(`   - Plain: ${plainPassword}`);
  console.log(`   - Match: ${match ? "✅ YES" : "❌ NO"}`);
}

async function runTests() {
  await testLogin("user@test.com", "user123456");
  await testLogin("admin@test.com", "admin123456");
}

runTests();
