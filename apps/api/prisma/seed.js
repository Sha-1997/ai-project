"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto = require("crypto");
const prisma = new client_1.PrismaClient();

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

async function main() {
    console.log('[JovianeX Seed] Seeding default database parameters...');
    const systemUser = await prisma.user.upsert({
        where: { email: 'system@jovianex.com' },
        update: {},
        create: {
            founderId: 'JXF-2026-000000',
            email: 'system@jovianex.com',
            passwordHash: '$2b$10$systempasswordhashplaceholder',
            status: 'ACTIVE',
            profile: {
                create: {
                    fullName: 'JovianeX System Administrator',
                    phoneNumber: '+971 4 000 0000',
                    country: 'UAE',
                },
            },
        },
    });
    console.log(`[JovianeX Seed] System administrator account ready: ${systemUser.email}`);

    // --- Test Users ---
    const testUsers = [
        { founderId: 'JXF-2026-000001', email: 'admin@jovianex.com',     password: 'Admin@1234',     fullName: 'Admin User',      country: 'UAE' },
        { founderId: 'JXF-2026-000002', email: 'founder@jovianex.com',   password: 'Founder@1234',   fullName: 'Test Founder',    country: 'UAE' },
        { founderId: 'JXF-2026-000003', email: 'candidate@jovianex.com', password: 'Candidate@1234', fullName: 'Test Candidate',  country: 'UAE' },
        { founderId: 'JXF-2026-000004', email: 'employer@jovianex.com',  password: 'Employer@1234',  fullName: 'Test Employer',   country: 'UAE' },
    ];
    for (const u of testUsers) {
        const passwordHash = hashPassword(u.password);
        await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash, status: 'ACTIVE' },
            create: {
                founderId: u.founderId,
                email: u.email,
                passwordHash,
                status: 'ACTIVE',
                profile: {
                    create: {
                        fullName: u.fullName,
                        country: u.country,
                    },
                },
            },
        });
        console.log(`[JovianeX Seed] Test user ready: ${u.email}  /  password: ${u.password}`);
    }

    // --- Job Categories ---
    const jobCategories = [
        'Technology', 'Finance', 'Marketing', 'Operations',
        'Sales', 'Human Resources', 'Design', 'Legal',
    ];
    for (const name of jobCategories) {
        await prisma.jobCategory.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }
    console.log('[JovianeX Seed] Job categories seeded.');

    const plans = [
        {
            code: 'founder_launch',
            name: 'Founder Launch Tier',
            price: 49,
            currency: 'AED',
            durationYears: 3,
            maxSeats: 1000,
            description: 'First 1,000 Members, early bird access.',
            benefits: ['Lifetime Badge', 'Priority Candidate Matches', 'Zero Commission Referral Cashouts'],
        },
        {
            code: 'early_growth',
            name: 'Early Growth Tier',
            price: 99,
            currency: 'AED',
            durationYears: 3,
            maxSeats: 4000,
            description: 'Next 4,000 Members early access tier.',
            benefits: ['Founder Badge', 'Priority Matches', 'Zero Commission Referral Cashouts'],
        },
        {
            code: 'growth',
            name: 'Growth Tier',
            price: 199,
            currency: 'AED',
            durationYears: 3,
            maxSeats: 5000,
            description: 'Next 5,000 Members access tier.',
            benefits: ['Founder Badge', 'Standard Matches', 'Standard Referral Commissions'],
        },
        {
            code: 'expansion',
            name: 'Expansion Tier',
            price: 249,
            currency: 'AED',
            durationYears: 3,
            activeTo: new Date('2027-01-31T23:59:59Z'),
            description: 'Expansion launch window, active until January 31, 2027.',
            benefits: ['Founder Status', 'Standard Matches', 'Standard Referral Commissions'],
        },
        {
            code: 'standard',
            name: 'Standard Tier 2027A',
            price: 299,
            currency: 'AED',
            durationYears: 2,
            activeFrom: new Date('2027-02-01T00:00:00Z'),
            activeTo: new Date('2027-06-30T23:59:59Z'),
            description: 'Standard plan active February to June 2027.',
            benefits: ['Ecosystem Account Access', 'Ecosystem Referrals'],
        },
        {
            code: 'growth_t2',
            name: 'Growth Tier 2027B',
            price: 399,
            currency: 'AED',
            durationYears: 2,
            activeFrom: new Date('2027-07-01T00:00:00Z'),
            activeTo: new Date('2027-12-31T23:59:59Z'),
            description: 'Growth plan active July to December 2027.',
            benefits: ['Ecosystem Account Access', 'Ecosystem Referrals'],
        },
        {
            code: 'standard_t2',
            name: 'Standard Tier 2028',
            price: 499,
            currency: 'AED',
            durationYears: 1,
            activeFrom: new Date('2028-01-01T00:00:00Z'),
            description: 'Standard plan active from January 2028.',
            benefits: ['Ecosystem Account Access', 'Ecosystem Referrals'],
        },
    ];
    for (const plan of plans) {
        await prisma.membershipPlan.upsert({
            where: { code: plan.code },
            update: {
                name: plan.name,
                price: plan.price,
                maxSeats: plan.maxSeats,
                activeFrom: plan.activeFrom || null,
                activeTo: plan.activeTo || null,
                description: plan.description,
                benefits: plan.benefits,
            },
            create: {
                code: plan.code,
                name: plan.name,
                price: plan.price,
                currency: plan.currency,
                durationYears: plan.durationYears,
                maxSeats: plan.maxSeats || null,
                activeFrom: plan.activeFrom || null,
                activeTo: plan.activeTo || null,
                description: plan.description,
                benefits: plan.benefits,
            },
        });
    }
    const widgets = [
        { code: 'widget_membership', title: 'Membership Status', icon: 'credit-card', order: 1, module: 'core' },
        { code: 'widget_founder_badge', title: 'Founder Badge', icon: 'award', order: 2, module: 'core' },
        { code: 'widget_jobs_status', title: 'AI Jobs Matcher', icon: 'briefcase', order: 3, module: 'jobs' },
        { code: 'widget_referral_progress', title: 'Referral Progress', icon: 'users', order: 4, module: 'referrals' },
        { code: 'widget_campaign_updates', title: 'Campaign Challenges', icon: 'gift', order: 5, module: 'campaigns' },
        { code: 'widget_roadmap', title: 'Ecosystem Roadmap', icon: 'map', order: 6, module: 'core' },
    ];
    for (const widget of widgets) {
        await prisma.dashboardWidget.upsert({
            where: { code: widget.code },
            update: {
                title: widget.title,
                icon: widget.icon,
                order: widget.order,
                module: widget.module,
            },
            create: {
                code: widget.code,
                title: widget.title,
                icon: widget.icon,
                order: widget.order,
                module: widget.module,
                visibility: true,
            },
        });
    }
    const campaigns = [
        {
            code: 'referral_program',
            name: 'Ecosystem Referral Program',
            type: 'REFERRAL',
            status: 'LIVE',
            rules: [
                { key: 'min_referrals', value: '1' },
                { key: 'require_verified', value: 'true' },
            ],
        },
        {
            code: 'naming_challenge',
            name: 'Ecosystem Naming Challenge',
            type: 'NAMING_CHALLENGE',
            status: 'LIVE',
            endAt: new Date('2027-01-31T23:59:59Z'),
            rules: [
                { key: 'max_entries_per_user', value: '1' },
                { key: 'require_email_verified', value: 'true' },
            ],
        },
        {
            code: 'giveaway_campaign',
            name: 'Founder Launch Giveaway',
            type: 'GIVEAWAY',
            status: 'LIVE',
            rules: [
                { key: 'require_membership_active', value: 'true' },
                { key: 'min_qualified_referrals', value: '3' },
            ],
        },
    ];
    for (const cam of campaigns) {
        const createdCampaign = await prisma.campaign.upsert({
            where: { code: cam.code },
            update: {
                name: cam.name,
                type: cam.type,
                status: cam.status,
                endAt: cam.endAt || null,
            },
            create: {
                code: cam.code,
                name: cam.name,
                type: cam.type,
                status: cam.status,
                endAt: cam.endAt || null,
            },
        });
        for (const rule of cam.rules) {
            await prisma.campaignRule.upsert({
                where: {
                    campaignId_ruleKey: {
                        campaignId: createdCampaign.id,
                        ruleKey: rule.key,
                    },
                },
                update: { ruleValue: rule.value },
                create: {
                    campaignId: createdCampaign.id,
                    ruleKey: rule.key,
                    ruleValue: rule.value,
                },
            });
        }
    }
    console.log('[JovianeX Seed] Seeded 3 default promotional campaigns and rule configurations.');
    console.log('[JovianeX Seed] Seeding process finished successfully.');
}
main()
    .catch((e) => {
    console.error('[JovianeX Seed] Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map