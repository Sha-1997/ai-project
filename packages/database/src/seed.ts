import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding process...");

  // 1. Seed Roles
  console.log("Seeding Roles...");
  const rolesData = [
    { name: "Administrator", code: "ADMIN", description: "System Administrator with full access" },
    { name: "Founder Member", code: "FOUNDER", description: "Early Founder membership account tier" },
    { name: "Regular Member", code: "MEMBER", description: "Standard membership subscriber tier" },
    { name: "Content Moderator", code: "MODERATOR", description: "Moderator for community forums" },
    { name: "Customer Support Agent", code: "SUPPORT", description: "Support desk ticketing agent" },
  ];

  const roles: Record<string, any> = {};
  for (const item of rolesData) {
    roles[item.code] = await prisma.role.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  // 2. Seed Permissions
  console.log("Seeding Permissions...");
  const permissionsData = [
    { name: "Full System Write Access", code: "SYSTEM_ALL", description: "Grants full administrative write access" },
    { name: "Access AI Modules", code: "MODULE_ACCESS", description: "Grants access to active AI modules" },
    { name: "View Billing Statements", code: "BILLING_VIEW", description: "Grants access to view paid invoices and tax statements" },
    { name: "Trigger Refund Overrides", code: "REFUND_TRIGGER", description: "Grants authority to issue manual billing refunds" },
    { name: "Access Support Helpdesk Admin", code: "SUPPORT_ADMIN", description: "Grants access to Zendesk support queue routers" },
  ];

  const permissions: Record<string, any> = {};
  for (const item of permissionsData) {
    permissions[item.code] = await prisma.permission.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
  }

  // 3. Link Roles and Permissions
  console.log("Linking Roles and Permissions...");
  // Admin gets all permissions
  for (const permKey of Object.keys(permissions)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roles["ADMIN"].id,
          permissionId: permissions[permKey].id,
        },
      },
      update: {},
      create: {
        roleId: roles["ADMIN"].id,
        permissionId: permissions[permKey].id,
      },
    });
  }

  // Founder and Member get MODULE_ACCESS and BILLING_VIEW
  const clientPerms = ["MODULE_ACCESS", "BILLING_VIEW"];
  for (const code of ["FOUNDER", "MEMBER"]) {
    for (const permKey of clientPerms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[code].id,
            permissionId: permissions[permKey].id,
          },
        },
        update: {},
        create: {
          roleId: roles[code].id,
          permissionId: permissions[permKey].id,
        },
      });
    }
  }

  // Support gets SUPPORT_ADMIN
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: roles["SUPPORT"].id,
        permissionId: permissions["SUPPORT_ADMIN"].id,
      },
    },
    update: {},
    create: {
      roleId: roles["SUPPORT"].id,
      permissionId: permissions["SUPPORT_ADMIN"].id,
    },
  });

  // 4. Seed Subscription Plans
  console.log("Seeding Subscription Plans...");
  const plansData = [
    {
      name: "Founder Tier Launch Offer",
      code: "FOUNDER",
      description: "Exclusive Early Founder membership with locked pricing",
      price: 49.00,
      currency: "AED",
      durationDays: 365,
      maxConcurrentDevice: 2,
      status: "ACTIVE",
    },
    {
      name: "Standard Annual Membership",
      code: "STANDARD",
      description: "Standard single account subscription plan",
      price: 199.00,
      currency: "AED",
      durationDays: 365,
      maxConcurrentDevice: 2,
      status: "ACTIVE",
    },
    {
      name: "Early Adopter Offer",
      code: "EARLY",
      description: "Special early adopter bundle",
      price: 99.00,
      currency: "AED",
      durationDays: 365,
      maxConcurrentDevice: 2,
      status: "ACTIVE",
    },
  ];

  for (const item of plansData) {
    await prisma.subscriptionPlan.upsert({
      where: { code: item.code },
      update: {
        price: item.price,
        durationDays: item.durationDays,
        maxConcurrentDevice: item.maxConcurrentDevice,
      },
      create: item,
    });
  }

  // 5. Seed Geography Master (GCC Countries with Tax rates)
  console.log("Seeding Geography (GCC Countries)...");
  const countriesData = [
    { name: "United Arab Emirates", code: "AE", vatRate: 0.0500, status: "ACTIVE" }, // 5% VAT
    { name: "Saudi Arabia", code: "SA", vatRate: 0.1500, status: "ACTIVE" },         // 15% VAT
    { name: "Oman", code: "OM", vatRate: 0.0500, status: "ACTIVE" },                // 5% VAT
    { name: "Qatar", code: "QA", vatRate: 0.0000, status: "ACTIVE" },               // 0% VAT
    { name: "Bahrain", code: "BH", vatRate: 0.1000, status: "ACTIVE" },             // 10% VAT
    { name: "Kuwait", code: "KW", vatRate: 0.0000, status: "ACTIVE" },              // 0% VAT
  ];

  for (const item of countriesData) {
    await prisma.country.upsert({
      where: { code: item.code },
      update: { vatRate: item.vatRate },
      create: item,
    });
  }

  // 6. Seed AI Modules Registry
  console.log("Seeding AI Modules Registry...");
  const modulesData = [
    { name: "AI Jobs MVP", code: "ai-jobs", version: "1.0.0", status: "ACTIVE", entryUrl: "/apps/ai-jobs" },
    { name: "AI Delivery Tracker", code: "ai-delivery", version: "1.0.0", status: "PLANNED", entryUrl: null },
    { name: "AI Travel Assistant", code: "ai-travel", version: "1.0.0", status: "PLANNED", entryUrl: null },
    { name: "Logistics Sync Integration", code: "logistics", version: "1.0.0", status: "PLANNED", entryUrl: null },
  ];

  for (const item of modulesData) {
    await prisma.aiModule.upsert({
      where: { code: item.code },
      update: { status: item.status },
      create: item,
    });
  }

  // 7. Seed System Settings
  console.log("Seeding System Settings...");
  const settingsData = [
    { key: "SYSTEM_MAINTENANCE_MODE", value: "false", description: "Global maintenance switch" },
    { key: "MAX_LOGIN_SESSION_DEVICES", value: "2", description: "Strict concurrent login sessions limit" },
    { key: "DEFAULT_BILLING_CURRENCY", value: "AED", description: "Primary platform transaction currency" },
  ];

  for (const item of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: item.key },
      update: { value: item.value },
      create: item,
    });
  }

  // 8. Seed Default Admin User
  console.log("Seeding Default Admin User...");
  const adminEmail = "admin@jovianex.com";
  // bcrypt hash for "JovianeXSecureAdmin2026!"
  // For safety in dev, seeding mock hashed placeholder key
  const mockPasswordHash = "$2b$12$Z0H7kKk38P4oU4435FzG3.k8R6G2H7h1d2E3f4G5h6I7j8K9l0M1n"; 

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Master Admin",
      email: adminEmail,
      mobile: "+971500000000",
      passwordHash: mockPasswordHash,
      status: "ACTIVE",
    },
  });

  // Link user to Admin Role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: roles["ADMIN"].id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: roles["ADMIN"].id,
    },
  });

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error occurred during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
