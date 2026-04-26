import PDFDocument from "pdfkit";
import { createWriteStream } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "test-document.pdf");

const doc = new PDFDocument({ margin: 50 });
doc.pipe(createWriteStream(outputPath));

// ── Title ──────────────────────────────────────────────
doc
  .fontSize(22)
  .font("Helvetica-Bold")
  .text("Artificial Intelligence: A Brief Overview", { align: "center" });

doc.moveDown(1.5);

// ── Section 1 ──────────────────────────────────────────
doc.fontSize(16).font("Helvetica-Bold").text("1. What is Artificial Intelligence?");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "Artificial Intelligence (AI) is the simulation of human intelligence processes by computer systems. " +
      "These processes include learning (acquiring information and rules for using it), reasoning " +
      "(using the rules to reach approximate or definite conclusions), and self-correction. " +
      "AI was founded as an academic discipline in 1956 by John McCarthy at Dartmouth College."
  );

doc.moveDown(1);

// ── Section 2 ──────────────────────────────────────────
doc.fontSize(16).font("Helvetica-Bold").text("2. Types of AI");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "There are three main types of AI:\n\n" +
      "• Narrow AI (Weak AI): Designed to perform a specific task, such as voice recognition or image classification. " +
      "Examples include Siri, Alexa, and recommendation engines used by Netflix and Amazon.\n\n" +
      "• General AI (Strong AI): A machine with the ability to apply intelligence to any problem, " +
      "much like a human being. This type of AI does not yet exist.\n\n" +
      "• Super AI: A level of intelligence that surpasses human intelligence. This remains theoretical."
  );

doc.moveDown(1);

// ── Section 3 ──────────────────────────────────────────
doc.fontSize(16).font("Helvetica-Bold").text("3. Machine Learning");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "Machine Learning (ML) is a subset of AI that allows systems to learn and improve from experience " +
      "without being explicitly programmed. The three main types of machine learning are:\n\n" +
      "• Supervised Learning: The model is trained on labeled data. Examples: spam detection, image recognition.\n\n" +
      "• Unsupervised Learning: The model finds patterns in unlabeled data. Examples: customer segmentation, anomaly detection.\n\n" +
      "• Reinforcement Learning: The model learns by interacting with an environment and receiving rewards or penalties. " +
      "Examples: game playing (AlphaGo), robotics."
  );

doc.moveDown(1);

// ── Section 4 ──────────────────────────────────────────
doc.fontSize(16).font("Helvetica-Bold").text("4. Large Language Models (LLMs)");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "Large Language Models (LLMs) are a type of AI model trained on massive amounts of text data. " +
      "They can understand and generate human-like text. Notable LLMs include:\n\n" +
      "• GPT-4 by OpenAI: Used in ChatGPT, capable of writing code, essays, and answering questions.\n\n" +
      "• Gemini by Google: Google's multimodal AI model capable of understanding text, images, and audio.\n\n" +
      "• LLaMA by Meta: An open-source large language model released for research purposes.\n\n" +
      "• Claude by Anthropic: An AI assistant focused on safety and helpfulness."
  );

doc.moveDown(1);

// ── Section 5 ──────────────────────────────────────────
doc.fontSize(16).font("Helvetica-Bold").text("5. RAG (Retrieval-Augmented Generation)");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "Retrieval-Augmented Generation (RAG) is a technique that combines information retrieval with " +
      "text generation. Instead of relying solely on the model's training data, RAG systems:\n\n" +
      "1. Retrieve relevant documents from an external knowledge base (like Pinecone or ChromaDB).\n" +
      "2. Provide those documents as context to the language model.\n" +
      "3. Generate an accurate, grounded response based on retrieved information.\n\n" +
      "RAG reduces hallucinations and allows models to answer questions about up-to-date or private information."
  );

doc.moveDown(1);

// ── Section 6 ──────────────────────────────────────────
doc.fontSize(16).font("Helvetica-Bold").text("6. AI Applications in 2026");
doc.moveDown(0.5);
doc
  .fontSize(12)
  .font("Helvetica")
  .text(
    "As of 2026, AI is being used across many industries:\n\n" +
      "• Healthcare: AI diagnoses diseases from medical scans with high accuracy.\n" +
      "• Finance: Fraud detection and algorithmic trading.\n" +
      "• Education: Personalized learning assistants and tutoring systems.\n" +
      "• Transportation: Self-driving vehicles and traffic optimization.\n" +
      "• Customer Service: AI chatbots handle millions of support queries daily.\n" +
      "• Content Creation: AI generates articles, images, videos, and music."
  );

doc.moveDown(1);

// ── Footer ─────────────────────────────────────────────
doc
  .fontSize(10)
  .fillColor("gray")
  .text("This document was generated for testing the Agentic Personal Assistant.", {
    align: "center",
  });

doc.end();
console.log(`✅ PDF created at: ${outputPath}`);
