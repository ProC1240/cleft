import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4000";
const accessSecret = process.env.JWT_ACCESS_SECRET;

if (!accessSecret) throw new Error("JWT_ACCESS_SECRET is required");

const marker = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
let userId;
let partyId;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} returned ${response.status}: ${text}`);
  }
  return body;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const health = await request("/health");
  expect(health?.ok === true, "Health endpoint did not return ok=true");

  const user = await prisma.user.create({
    data: {
      googleId: `smoke-google-${marker}`,
      email: `smoke-${marker}@example.test`,
      username: "Smoke User",
    },
  });
  userId = user.id;

  const token = jwt.sign({ sub: user.id, email: user.email }, accessSecret, { expiresIn: "15m" });
  const headers = { Authorization: `Bearer ${token}` };

  const session = await request("/auth/session", { headers });
  expect(session?.authenticated === true && session?.user?.userId === user.id, "Authenticated session is invalid");

  const profile = await request("/users/profile", {
    method: "PATCH",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ username: "Smoke Tester", currencySymbol: "THB" }),
  });
  expect(profile?.username === "Smoke Tester", "Profile update did not persist");

  const party = {
    partyName: `Smoke Party ${marker}`,
    partyDate: new Date().toISOString(),
    items: [
      { name: "Pizza", price: 300, note: "x1" },
      { name: "Drink", price: 100, note: "x1" },
    ],
    participants: [
      { name: "Alice", splitType: "ALL", itemNames: [] },
      { name: "Bob", splitType: "PARTIAL", itemNames: ["Pizza"] },
    ],
  };

  const calculation = await request("/party/calculate", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(party),
  });
  const amountByName = new Map(calculation.participants.map((participant) => [participant.name, participant.amount]));
  expect(calculation.totalAmount === 400, "Calculated total should be 400");
  expect(amountByName.get("Alice") === 250 && amountByName.get("Bob") === 150, "Calculated shares are incorrect");

  const form = new FormData();
  form.set("payload", JSON.stringify({ party, confirmedAt: new Date().toISOString() }));
  const confirmed = await request("/party/confirm", {
    method: "POST",
    headers,
    body: form,
  });
  partyId = confirmed.id;
  expect(confirmed.name === party.partyName, "Confirmed party name is incorrect");

  const history = await request("/party/history?all=true", { headers });
  expect(history.some((record) => record.party?.id === partyId), "Confirmed party is missing from history");

  console.log("Smoke test passed: health, auth, profile, calculation, confirm, and history");
} finally {
  if (partyId) await prisma.party.deleteMany({ where: { id: partyId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
