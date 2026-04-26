import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "fake-company.pdf");

const doc = new PDFDocument({ margin: 50 });
doc.pipe(createWriteStream(outputPath));

// ── Title ──────────────────────────────────────────────
doc
  .fontSize(22)
  .font("Helvetica-Bold")
  .text("NovaTech Solutions - Internal Company Profile", { align: "center" });

doc.moveDown(0.3);
doc
  .fontSize(11)
  .font("Helvetica")
  .fillColor("gray")
  .text("Confidential Document - For Internal Use Only", { align: "center" });

doc.fillColor("black").moveDown(1.5);

// ── Section 1 ──────────────────────────────────────────
doc.fontSize(15).font("Helvetica-Bold").text("1. Company Overview");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "NovaTech Solutions was founded in 2019 by Kareem Mansour and Lina Al-Harbi in Riyadh, Saudi Arabia. " +
      "The company specializes in cloud infrastructure and AI-powered logistics systems. " +
      "As of 2026, NovaTech employs 340 people across 4 offices: Riyadh (HQ), Dubai, Cairo, and Berlin. " +
      "The company's annual revenue in 2025 reached $47 million, a 38% increase from the previous year."
  );

doc.moveDown(1);

// ── Section 2 ──────────────────────────────────────────
doc.fontSize(15).font("Helvetica-Bold").text("2. Products");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "NovaTech's main products are:\n\n" +
      "• FleetMind v3: An AI-powered fleet management platform used by over 200 logistics companies in the GCC. " +
      "It uses real-time GPS, weather data, and predictive maintenance alerts.\n\n" +
      "• CloudNest Pro: A private cloud solution for mid-size enterprises, offering 99.98% uptime SLA " +
      "and automatic compliance with Saudi NDMO data residency regulations.\n\n" +
      "• SmartRoute API: A routing optimization API that reduced delivery times by an average of 23% " +
      "for its clients in 2025. Pricing starts at $199/month for up to 10,000 API calls."
  );

doc.moveDown(1);

// ── Section 3 ──────────────────────────────────────────
doc.fontSize(15).font("Helvetica-Bold").text("3. Key Employees");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "• Kareem Mansour (CEO): Co-founder with 15 years of experience in logistics software. " +
      "Previously VP of Engineering at FastCargo Ltd. Holds an MBA from KAUST.\n\n" +
      "• Lina Al-Harbi (CTO): Co-founder and lead architect of FleetMind. " +
      "She holds a PhD in Distributed Systems from TU Berlin and 3 patents in route optimization.\n\n" +
      "• Omar Ziyad (CFO): Joined NovaTech in 2022. Former financial analyst at Morgan Stanley Dubai. " +
      "Responsible for the company's Series B funding round of $18 million in 2023.\n\n" +
      "• Sara El-Nour (Head of AI): Leads the AI research team of 22 engineers. " +
      "Published 7 papers on reinforcement learning for logistics between 2021 and 2025."
  );

doc.moveDown(1);

// ── Section 4 ──────────────────────────────────────────
doc.fontSize(15).font("Helvetica-Bold").text("4. Financial Summary (2025)");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "Revenue breakdown by product in 2025:\n\n" +
      "• FleetMind v3:     $26.5 million  (56% of total revenue)\n" +
      "• CloudNest Pro:    $14.2 million  (30% of total revenue)\n" +
      "• SmartRoute API:    $6.3 million  (14% of total revenue)\n\n" +
      "Total operating expenses were $31 million, yielding a net profit of $16 million. " +
      "The company plans to reach $70 million in revenue by end of 2027 through expansion into Turkey and Nigeria."
  );

doc.moveDown(1);

// ── Section 5 ──────────────────────────────────────────
doc.fontSize(15).font("Helvetica-Bold").text("5. Internal Policies");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "• Remote Work Policy: Employees may work remotely up to 3 days per week. " +
      "All remote work must be approved by the direct manager via the internal portal (HRConnect).\n\n" +
      "• Annual Leave: Full-time employees are entitled to 25 days of paid leave per year. " +
      "Leave requests must be submitted at least 2 weeks in advance.\n\n" +
      "• Equipment Policy: Each employee receives a NovaTech laptop (Dell XPS or MacBook Pro) " +
      "and a monthly internet allowance of 200 SAR.\n\n" +
      "• Performance Review: Reviews are conducted every 6 months in March and September. " +
      "Bonuses range from 5% to 20% of annual salary based on performance score."
  );

doc.moveDown(1);

// ── Section 6 ──────────────────────────────────────────
doc.fontSize(15).font("Helvetica-Bold").text("6. Upcoming Projects (2026)");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "• Project Falcon: A new AI model for predicting supply chain disruptions, " +
      "expected to launch in Q3 2026. Budget: $3.2 million.\n\n" +
      "• NovaTech Academy: An internal training platform for upskilling employees in AI and cloud technologies. " +
      "Target: train 200 employees by December 2026.\n\n" +
      "• Partnership with LogiGulf Corp: A joint venture to deploy FleetMind in 15 Saudi government " +
      "logistics departments starting Q2 2026. Contract value: $8.5 million over 3 years."
  );

doc.moveDown(1.5);

// ── Footer ─────────────────────────────────────────────
doc
  .fontSize(10)
  .fillColor("gray")
  .text(
    "NovaTech Solutions © 2026 | This document is fictional and created for testing purposes only.",
    { align: "center" }
  );

doc.end();
console.log(`✅ Fake company PDF created at: ${outputPath}`);
