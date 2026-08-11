const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function runRecruiterValidation() {
  console.log("=== STARTING JOVIANEX RECRUITER E2E VALIDATION ===");

  const testEmail = `recruiter-e2e-${Date.now()}@jovianex.ai`;
  const password = "password123";
  const fullName = "E2E Recruiter";
  const country = "United Arab Emirates";

  let token = "";
  let orgId = "";
  let jobId = "";
  let applicationId = "";

  // 1. CREATE AN ACTIVE EMPLOYER ACCOUNT DIRECTLY
  try {
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({ data: { name: "Test Corp" } });
    }
    orgId = org.id;

    const pHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash: pHash,
        founderId: `JXF-2026-${Date.now()}`,
        status: "ACTIVE"
      }
    });

    const emp = await prisma.employer.create({
      data: {
        userId: user.id
      }
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        employerId: emp.id,
        role: "OWNER"
      }
    });

    console.log("✔ STEP 1: Recruiter account & organization setup inside PostgreSQL.");
  } catch (e) {
    console.error("❌ STEP 1: Account setup failed.", e.message);
    process.exit(1);
  }

  // 2. RECRUITER LOGIN
  try {
    const logRes = await fetch("http://localhost:5000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password })
    });
    const logData = await logRes.json();
    if (!logRes.ok) throw new Error("Login failed: " + JSON.stringify(logData));
    token = logData.data.accessToken;
    console.log("✔ STEP 2: Recruiter Login successful.");
  } catch (e) {
    console.error("❌ STEP 2: Login failed.", e.message);
    process.exit(1);
  }

  // 3. GET EMPLOYER ME & ORG ME
  try {
    const empRes = await fetch("http://localhost:5000/api/v1/employers/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!empRes.ok) throw new Error("Get employer info failed");

    const orgRes = await fetch("http://localhost:5000/api/v1/organizations/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!orgRes.ok) throw new Error("Get organization info failed");
    console.log("✔ STEP 3: Recruiter Profile & Organization loading verified.");
  } catch (e) {
    console.error("❌ STEP 3: Load profiles failed.", e.message);
    process.exit(1);
  }

  // 4. CREATE A JOB
  try {
    const jobRes = await fetch("http://localhost:5000/api/v1/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: "Senior QA Architect",
        description: "Analyze microservices codebases.",
        employmentType: "FULL_TIME",
        experienceLevel: "SENIOR",
        categoryName: "Artificial Intelligence",
        organizationId: orgId,
        locations: [{ country: "UAE", city: "Dubai", workplaceType: "HYBRID" }],
        skills: ["TypeScript", "Jest"],
        benefits: ["Remote flexibility"]
      })
    });
    const jobData = await jobRes.json();
    if (!jobRes.ok) throw new Error("Create job failed: " + JSON.stringify(jobData));
    const job = jobData.data || jobData;
    jobId = job.id;
    console.log("✔ STEP 4: Job Opening created successfully.");
  } catch (e) {
    console.error("❌ STEP 4: Create job failed.", e.message);
    process.exit(1);
  }

  // 5. PUBLISH JOB OPENING
  try {
    const pubRes = await fetch(`http://localhost:5000/api/v1/jobs/${jobId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!pubRes.ok) throw new Error("Publish status transition failed");
    console.log("✔ STEP 5: Job status transitioned to PUBLISHED.");
  } catch (e) {
    console.error("❌ STEP 5: Publish job failed.", e.message);
    process.exit(1);
  }

  // 6. SUBMIT APPLICANT RECORD
  try {
    const candEmail = `cand-${Date.now()}@jovianex.ai`;
    const candUser = await prisma.user.create({
      data: {
        email: candEmail,
        passwordHash: "hash",
        founderId: `JXF-2026-${Date.now() + 1}`,
        status: "ACTIVE"
      }
    });

    const cand = await prisma.candidate.create({
      data: {
        userId: candUser.id,
        headline: "TypeScript Tester",
        careerSummary: "Writes automated API tests.",
        skills: ["TypeScript", "Jest"]
      }
    });

    const app = await prisma.jobApplication.create({
      data: {
        jobId,
        candidateId: cand.id,
        status: "APPLIED",
        notes: "Interested in the role"
      }
    });
    applicationId = app.id;
    console.log("✔ STEP 6: Seed candidate application submitted.");
  } catch (e) {
    console.error("❌ STEP 6: Candidate submit failed.", e.message);
    process.exit(1);
  }

  // 7. GET EMPLOYERS APPLICATIONS
  try {
    const listRes = await fetch("http://localhost:5000/api/v1/employers/applications", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error("List applications failed: " + JSON.stringify(listData));
    const list = listData.data || listData;
    console.log(`✔ STEP 7: Organization pipeline applications listed (Count: ${list.length}).`);
  } catch (e) {
    console.error("❌ STEP 7: List applications failed.", e.message);
    process.exit(1);
  }

  // 8. TRANSITION CANDIDATE STATUS
  try {
    const statusRes = await fetch(`http://localhost:5000/api/v1/employers/applications/${applicationId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: "SHORTLISTED", notes: "Impressive resume tags match" })
    });
    if (!statusRes.ok) throw new Error("Update status failed");
    console.log("✔ STEP 8: Candidate stage updated to SHORTLISTED.");
  } catch (e) {
    console.error("❌ STEP 8: Transition candidate status failed.", e.message);
    process.exit(1);
  }

  // 9. ATTACH COMMENTS NOTE
  try {
    const noteRes = await fetch(`http://localhost:5000/api/v1/applications/${applicationId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: "Strong algorithms background." })
    });
    if (!noteRes.ok) throw new Error("Attach note failed");
    console.log("✔ STEP 9: Recruiter private note attached to applicant card.");
  } catch (e) {
    console.error("❌ STEP 9: Attach note failed.", e.message);
    process.exit(1);
  }

  // 10. FINAL HIRED DECISION
  try {
    const hireRes = await fetch(`http://localhost:5000/api/v1/applications/${applicationId}/hiring`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        decision: "HIRED",
        offeredSalary: 180000,
        joinedAt: "2026-08-01",
        notes: "Offer accepted by candidate."
      })
    });
    if (!hireRes.ok) throw new Error("Hired decision failed");
    console.log("✔ STEP 10: Candidate hired and decision logged successfully.");
  } catch (e) {
    console.error("❌ STEP 10: Hire decision failed.", e.message);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log("🎉 RECRUITER PORTAL MVP E2E VALIDATION: SUCCESS!");
  console.log("========================================================");
  process.exit(0);
}

runRecruiterValidation();
