import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const artifact = JSON.parse(
  fs.readFileSync(
    "./artifacts/contracts/DocumentVerification.sol/DocumentVerification.json",
    "utf-8"
  )
);

async function main() {
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  console.log("Deploying contract...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("✅ Contract deployed at:", address);

  fs.writeFileSync(
    "./contract-address.json",
    JSON.stringify({ address }, null, 2)
  );
  console.log("📁 Address saved to contract-address.json");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
