const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runValidation() {
  console.log("=== STARTING JOVIANEX E2E API VALIDATION ===");

  const testEmail = `candidate-e2e-${Date.now()}@jovianex.ai`;
  const password = "password123";
  const fullName = "E2E Test Candidate";
  const country = "United Arab Emirates";

  let token = "";
  let jobId = "";
  let applicationId = "";

  // 1. REGISTER
  try {
    const regRes = await fetch("http://localhost:5000/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email: testEmail, country, password, confirmPassword: password })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error("Register failed: " + JSON.stringify(regData));
    console.log("✔ STEP 1: Registration successful.");

    // Activate user directly in DB
    await prisma.user.update({
      where: { email: testEmail },
      data: { status: "ACTIVE" }
    });
    console.log("✔ STEP 1b: User email status activated directly inside PostgreSQL.");
  } catch (e) {
    console.error("❌ STEP 1: Registration failed.", e.message);
    process.exit(1);
  }

  // 2. LOGIN
  try {
    const logRes = await fetch("http://localhost:5000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password })
    });
    const logData = await logRes.json();
    if (!logRes.ok) throw new Error("Login failed: " + JSON.stringify(logData));
    token = logData.data.accessToken;
    console.log("✔ STEP 2: Login successful. Token retrieved.");
  } catch (e) {
    console.error("❌ STEP 2: Login failed.", e.message);
    process.exit(1);
  }

  // 3. FETCH RESUME PROFILE
  try {
    const resRes = await fetch("http://localhost:5000/api/v1/resume", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const resData = await resRes.json();
    if (!resRes.ok) throw new Error("Fetch resume failed: " + JSON.stringify(resData));
    console.log("✔ STEP 3: Fetch Resume Profile successful.");
  } catch (e) {
    console.error("❌ STEP 3: Fetch resume failed.", e.message);
    process.exit(1);
  }

  // 4. UPDATE RESUME PROFILE
  try {
    const updRes = await fetch("http://localhost:5000/api/v1/resume", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        headline: "Senior TypeScript Engineer",
        careerSummary: "Specialize in microservices design.",
        currentLocation: "Dubai, UAE",
        preferredLocation: "Remote",
        skills: ["TypeScript", "NestJS", "PostgreSQL"],
        experiences: [
          {
            title: "Software Engineer",
            companyName: "Logistics Corp",
            startDate: "2023-01-01",
            isCurrent: true,
            description: "Developed core API microservices."
          }
        ]
      })
    });
    const updData = await updRes.json();
    if (!updRes.ok) throw new Error("Update resume failed: " + JSON.stringify(updData));
    console.log("✔ STEP 4: Update Resume Profile successful.");
  } catch (e) {
    console.error("❌ STEP 4: Update resume failed.", e.message);
    process.exit(1);
  }

  // 5. RUN ATS ANALYSIS
  try {
    const atsRes = await fetch("http://localhost:5000/api/v1/resume/analyze", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ jobDescription: "Looking for TypeScript, NestJS and Postgres developers." })
    });
    const atsData = await atsRes.json();
    if (!atsRes.ok) throw new Error("ATS scan failed: " + JSON.stringify(atsData));
    const score = atsData.data ? atsData.data.overallScore : atsData.overallScore;
    console.log(`✔ STEP 5: ATS Scan Audit completed successfully (Score: ${score}%).`);
  } catch (e) {
    console.error("❌ STEP 5: ATS scan failed.", e.message);
    process.exit(1);
  }

  // 6. FETCH JOBS LISTING
  try {
    const jobRes = await fetch("http://localhost:5000/api/v1/jobs");
    const jobData = await jobRes.json();
    if (!jobRes.ok) throw new Error("Fetch jobs failed: " + JSON.stringify(jobData));
    const jobsList = jobData.data ? jobData.data.jobs : jobData.jobs;
    if (jobsList && jobsList.length > 0) {
      jobId = jobsList[0].id;
    }
    console.log("✔ STEP 6: Get Jobs Marketplace listing successful.");
  } catch (e) {
    console.error("❌ STEP 6: Fetch jobs failed.", e.message);
    process.exit(1);
  }

  // Fallback: If no published job, query prisma to fetch one or make one published
  if (!jobId) {
    console.log("Creating seed job for validation...");
    try {
      let org = await prisma.organization.findFirst();
      if (!org) {
        org = await prisma.organization.create({ data: { name: "Test Corp" } });
      }
      
      const emailRec = `recruiter-${Date.now()}@jovianex.ai`;
      const user = await prisma.user.create({
        data: {
          email: emailRec,
          passwordHash: "hash",
          founderId: `JXF-2026-${Date.now()}`
        }
      });
      
      let emp = await prisma.employer.create({ data: { userId: user.id } });
      
      const job = await prisma.job.create({
        data: {
          title: "Senior Node Developer",
          description: "Develop services.",
          employmentType: "FULL_TIME",
          status: "PUBLISHED",
          employerId: emp.id,
          organizationId: org.id
        }
      });
      jobId = job.id;
      console.log("✔ Seed job generated successfully.");
    } catch (e) {
      console.error("❌ Seed job creation failed.", e.message);
      process.exit(1);
    }
  }

  // 7. SAVE/BOOKMARK JOB
  try {
    const svRes = await fetch("http://localhost:5000/api/v1/jobs/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ jobId })
    });
    const svData = await svRes.json();
    if (!svRes.ok) throw new Error("Save job failed: " + JSON.stringify(svData));
    console.log("✔ STEP 7: Job bookmarked successfully.");
  } catch (e) {
    console.error("❌ STEP 7: Save job failed.", e.message);
    process.exit(1);
  }

  // 8. LIST SAVED JOBS
  try {
    const listRes = await fetch("http://localhost:5000/api/v1/jobs/saved", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listData = await listRes.json();
    if (!listRes.ok) throw new Error("Get saved jobs failed: " + JSON.stringify(listData));
    const savedJobsList = listData.data ? listData.data : listData;
    console.log(`✔ STEP 8: Get saved jobs verified (Count: ${savedJobsList.length}).`);
  } catch (e) {
    console.error("❌ STEP 8: Get saved jobs failed.", e.message);
    process.exit(1);
  }

  // 9. QUICK APPLY TO JOB
  try {
    const apRes = await fetch("http://localhost:5000/api/v1/jobs/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ jobId, notes: "Highly interested" })
    });
    const apData = await apRes.json();
    if (!apRes.ok) throw new Error("Quick apply failed: " + JSON.stringify(apData));
    const appRecord = apData.data ? apData.data : apData;
    applicationId = appRecord.id;
    console.log("✔ STEP 9: Job application submitted successfully.");
  } catch (e) {
    console.error("❌ STEP 9: Quick apply failed.", e.message);
    process.exit(1);
  }

  // 10. CAREER DASHBOARD SUMMARY
  try {
    const dashRes = await fetch("http://localhost:5000/api/v1/career/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    if (!dashRes.ok) throw new Error("Dashboard summary failed: " + JSON.stringify(dashData));
    const statsObj = dashData.data ? dashData.data.widgets : dashData.widgets;
    console.log("✔ STEP 10: Career Dashboard metrics successfully verified: " + JSON.stringify(statsObj));
  } catch (e) {
    console.error("❌ STEP 10: Dashboard summary failed.", e.message);
    process.exit(1);
  }

  console.log("\n=============================================");
  console.log("🎉 E2E END-TO-END VALIDATION: SUCCESS!");
  console.log("=============================================");
  process.exit(0);
}

runValidation();
