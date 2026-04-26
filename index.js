import express from "express";
import multer from "multer";
import crypto from "crypto";
import cors from "cors";
import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors());
app.use(express.static(path.join(__dirname)));  // ← add this
app.use(express.json());

// --- Blockchain Setup ---
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const artifact = JSON.parse(
  fs.readFileSync(
    "./artifacts/contracts/DocumentVerification.sol/DocumentVerification.json",
    "utf-8"
  )
);

const { address: contractAddress } = JSON.parse(
  fs.readFileSync("./contract-address.json", "utf-8")
);

const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
console.log("🔗 Connected to contract at:", contractAddress);

// --- Multer Setup ---
const upload = multer({ storage: multer.memoryStorage() });

// --- Helper ---
function hashFile(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// --- Routes ---
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const hash = hashFile(req.file.buffer);

  try {
    const tx = await contract.addDocument(hash);
    await tx.wait();
    res.json({ message: "Stored on blockchain ✅", hash, txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to store on blockchain" });
  }
});

app.post("/verify", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const hash = hashFile(req.file.buffer);

  try {
    const exists = await contract.verifyDocument(hash);
    res.json({
      hash,
      verified: exists,
      message: exists
        ? "✅ Document is authentic and exists on blockchain"
        : "❌ Document NOT found on blockchain",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));