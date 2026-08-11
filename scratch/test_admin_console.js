const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function runAdminConsoleValidation() {
  console.log("=== STARTING JOVIANEX ADMIN CONSOLE E2E VALIDATION ===");

  const testEmail = `admin-e2e-${Date.now()}@jovianex.com`;
  const password = "adminpassword123";

  let token = "";
  let userIdToSuspend = "";
  let newPlanCode = `plan_e2e_${Date.now()}`;

  // 1. SEED ADMINISTRATIVE USER
  try {
    const pHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: pHash,
        founderId: `JXF-2026-${Date.now()}`,
        status: "ACTIVE"
      }
    });
    userIdToSuspend = user.id;

    await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: "E2E Administrator",
        country: "United Arab Emirates"
      }
    });

    console.log("✔ STEP 1: Admin User seeded in database.");
  } catch (e) {
    console.error("❌ STEP 1: User seeding failed.", e.message);
    process.exit(1);
  }

  // 2. ADMIN LOGIN
  try {
    const logRes = await fetch("http://localhost:5000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password })
    });
    const logData = await logRes.json();
    if (!logRes.ok) throw new Error("Login failed: " + JSON.stringify(logData));
    token = logData.data.accessToken;
    console.log("✔ STEP 2: Administrative Login validated.");
  } catch (e) {
    console.error("❌ STEP 2: Login failed.", e.message);
    process.exit(1);
  }

  // 3. GET FOUNDER SEATS TELEMETRY
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/founder-seats", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load seats summary");
    console.log("✔ STEP 3: Founder Seats Telemetry fetched successfully.");
  } catch (e) {
    console.error("❌ STEP 3: Telemetry fetch failed.", e.message);
    process.exit(1);
  }

  // 4. GET USERS DIRECTORY
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load users directory");
    const data = await res.json();
    const users = data.data?.users || data.users || [];
    console.log(`✔ STEP 4: Users Directory loaded (Count: ${users.length}).`);
  } catch (e) {
    console.error("❌ STEP 4: Users directory fetch failed.", e.message);
    process.exit(1);
  }

  // 5. GET MEMBERSHIP PLANS
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/membership/plans", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load plans list");
    const data = await res.json();
    const plans = data.data || data;
    console.log(`✔ STEP 5: Membership Plans list loaded (Count: ${plans.length}).`);
  } catch (e) {
    console.error("❌ STEP 5: Plans list fetch failed.", e.message);
    process.exit(1);
  }

  // 6. CREATE MEMBERSHIP PLAN
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/membership/plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        code: newPlanCode,
        name: "E2E Enterprise Plan",
        price: 999,
        durationYears: 2,
        maxSeats: 100,
        description: "Custom corporate operations plan",
        benefits: ["Priority support", "API Access"]
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error("Create plan failed: " + JSON.stringify(err));
    }
    console.log("✔ STEP 6: New Membership Plan created via API.");
  } catch (e) {
    console.error("❌ STEP 6: Plan creation failed.", e.message);
    process.exit(1);
  }

  // 7. GET PAYMENTS TELEMETRY
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/payments", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load payments telemetry");
    console.log("✔ STEP 7: Payments Monitor telemetry loaded.");
  } catch (e) {
    console.error("❌ STEP 7: Payments fetch failed.", e.message);
    process.exit(1);
  }

  // 8. GET INVOICES LIST
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/invoices", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load invoices list");
    console.log("✔ STEP 8: Invoices log list fetched successfully.");
  } catch (e) {
    console.error("❌ STEP 8: Invoices list fetch failed.", e.message);
    process.exit(1);
  }

  // 9. GET GATEWAYS HEALTH
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/payment-providers/health", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load gateways health");
    console.log("✔ STEP 9: Payment Gateway Ping status loaded.");
  } catch (e) {
    console.error("❌ STEP 9: Gateways health fetch failed.", e.message);
    process.exit(1);
  }

  // 10. SUSPEND USER STATUS
  try {
    const res = await fetch(`http://localhost:5000/api/v1/admin/users/${userIdToSuspend}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: "SUSPENDED" })
    });
    if (!res.ok) throw new Error("Suspend user failed");
    console.log("✔ STEP 10: Target User suspended by administrator.");
  } catch (e) {
    console.error("❌ STEP 10: User suspension failed.", e.message);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log("🎉 JOVIANEX ADMIN CONSOLE INTEGRATION: SUCCESS!");
  console.log("========================================================");
  process.exit(0);
}

runAdminConsoleValidation();
