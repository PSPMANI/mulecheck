/**
 * CLI seed/import: npm run import -- data/sample-seed.csv [--pending] [--visibility=MASKED]
 * Same column format as the admin CSV import page.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { parseCsv } from "../src/lib/csv";
import { hashValue, normalize, validate } from "../src/lib/identifiers";
import { ACCOUNT_TYPES, SCAM_TYPES, ROLES } from "../src/lib/scamTypes";
import { parseDay } from "../src/lib/format";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: npm run import -- <file.csv> [--pending] [--visibility=FULL|MASKED|HIDDEN]");
    process.exit(1);
  }
  const publish = !args.includes("--pending");
  const defVis = args.find((a) => a.startsWith("--visibility="))?.split("=")[1]?.toUpperCase() ?? "MASKED";
  const rows = parseCsv(readFileSync(file, "utf8"));
  let imported = 0;
  for (const r of rows) {
    const type = (r.type ?? "").toUpperCase();
    if (!ACCOUNT_TYPES.some((t) => t.key === type)) {
      console.warn("skip (type):", r.value);
      continue;
    }
    const value = normalize(type, r.value ?? "");
    const v = validate(type, value);
    if (v) {
      console.warn("skip:", r.value, v);
      continue;
    }
    const scamType = (r.scamtype ?? "OTHER").toUpperCase();
    const role = (r.role ?? "MULE").toUpperCase();
    const amount = parseInt(r.amountinr ?? "0", 10) || 0;
    const visibility = (r.visibility || defVis).toUpperCase();
    const exposedOn = (r.exposedon && parseDay(r.exposedon)) || new Date();
    const valueHash = hashValue(value);
    const existing = await prisma.account.findUnique({ where: { type_valueHash: { type, valueHash } } });
    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: { reportCount: { increment: 1 }, totalAmountInr: { increment: amount }, lastReported: new Date() },
      });
    } else {
      await prisma.account.create({
        data: {
          type,
          value,
          valueHash,
          scamType: SCAM_TYPES.some((x) => x.key === scamType) ? scamType : "OTHER",
          role: ROLES.some((x) => x.key === role) ? role : "MULE",
          summary: r.summary || "Reported for fraud.",
          bankName: r.bankname || null,
          holderName: r.holdername || null,
          platform: r.platform || null,
          totalAmountInr: amount,
          reportCount: parseInt(r.reportcount ?? "1", 10) || 1,
          visibility: ["FULL", "MASKED", "HIDDEN"].includes(visibility) ? visibility : "MASKED",
          status: publish ? "APPROVED" : "PENDING",
          exposedOn: publish ? exposedOn : null,
          source: "SEED",
          tags: (r.tags ?? "").replace(/;/g, ","),
        },
      });
    }
    imported++;
  }
  console.log(`Imported ${imported}/${rows.length} rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
