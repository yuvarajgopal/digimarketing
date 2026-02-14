import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@digimarketing.com" },
    update: {},
    create: {
      email: "admin@digimarketing.com",
      name: "Admin User",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create manager user
  const managerPassword = await bcrypt.hash("manager123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@digimarketing.com" },
    update: {},
    create: {
      email: "manager@digimarketing.com",
      name: "Sarah Manager",
      passwordHash: managerPassword,
      role: "MANAGER",
    },
  });
  console.log(`Created manager user: ${manager.email}`);

  // Create viewer user
  const viewerPassword = await bcrypt.hash("viewer123", 12);
  const viewer = await prisma.user.upsert({
    where: { email: "viewer@digimarketing.com" },
    update: {},
    create: {
      email: "viewer@digimarketing.com",
      name: "John Viewer",
      passwordHash: viewerPassword,
      role: "VIEWER",
    },
  });
  console.log(`Created viewer user: ${viewer.email}`);

  // Create sample clients
  const client1 = await prisma.client.upsert({
    where: { id: "sample-client-1" },
    update: {},
    create: {
      id: "sample-client-1",
      name: "TechStart Inc",
      company: "TechStart Inc",
      email: "contact@techstart.io",
      website: "https://techstart.io",
      industry: "Technology",
      status: "ACTIVE",
      notes: "B2B SaaS startup focused on project management tools.",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "sample-client-2" },
    update: {},
    create: {
      id: "sample-client-2",
      name: "Green Eats",
      company: "Green Eats Co",
      email: "hello@greeneats.com",
      website: "https://greeneats.com",
      industry: "Food & Beverage",
      status: "ACTIVE",
      notes: "Organic meal delivery service, strong Instagram presence.",
    },
  });

  const client3 = await prisma.client.upsert({
    where: { id: "sample-client-3" },
    update: {},
    create: {
      id: "sample-client-3",
      name: "FitLife Gym",
      company: "FitLife Fitness LLC",
      email: "marketing@fitlifegym.com",
      website: "https://fitlifegym.com",
      industry: "Health & Fitness",
      status: "ACTIVE",
    },
  });

  console.log(`Created ${3} sample clients`);

  // Create tags for clients
  await prisma.clientTag.createMany({
    data: [
      { clientId: client1.id, tag: "B2B" },
      { clientId: client1.id, tag: "SaaS" },
      { clientId: client2.id, tag: "D2C" },
      { clientId: client2.id, tag: "Food" },
      { clientId: client3.id, tag: "Local" },
      { clientId: client3.id, tag: "Fitness" },
    ],
    skipDuplicates: true,
  });

  // Create sample posts
  await prisma.post.createMany({
    data: [
      {
        clientId: client1.id,
        createdById: manager.id,
        content: "Excited to announce our new project management features! Streamline your workflow with our latest update. #ProductivityTools #SaaS",
        platforms: ["LINKEDIN", "TWITTER"],
        status: "PUBLISHED",
        publishedAt: new Date("2026-02-10"),
      },
      {
        clientId: client1.id,
        createdById: manager.id,
        content: "5 tips to boost your team's productivity in 2026. Check out our latest blog post!",
        platforms: ["LINKEDIN", "FACEBOOK"],
        status: "SCHEDULED",
        scheduledAt: new Date("2026-02-20T10:00:00Z"),
      },
      {
        clientId: client2.id,
        createdById: manager.id,
        content: "Fresh, organic meals delivered to your door. Use code FRESH20 for 20% off your first order!",
        platforms: ["INSTAGRAM", "FACEBOOK"],
        status: "PUBLISHED",
        publishedAt: new Date("2026-02-12"),
      },
      {
        clientId: client2.id,
        createdById: manager.id,
        content: "Behind the scenes at our kitchen - watch how we prepare your favorite meals with love and care.",
        platforms: ["INSTAGRAM", "TIKTOK"],
        status: "DRAFT",
      },
      {
        clientId: client3.id,
        createdById: manager.id,
        content: "New year, new you! Join FitLife Gym this February and get your first month FREE. Limited spots available!",
        platforms: ["FACEBOOK", "INSTAGRAM"],
        status: "PUBLISHED",
        publishedAt: new Date("2026-02-01"),
      },
    ],
    skipDuplicates: true,
  });

  console.log("Created sample posts");

  // Create sample campaigns
  await prisma.campaign.createMany({
    data: [
      {
        clientId: client1.id,
        name: "Q1 2026 Brand Awareness",
        platform: "LINKEDIN",
        objective: "Brand Awareness",
        status: "ACTIVE",
        budget: 5000,
        budgetType: "LIFETIME",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
      },
      {
        clientId: client2.id,
        name: "Valentine's Day Promo",
        platform: "INSTAGRAM",
        objective: "Conversions",
        status: "ACTIVE",
        budget: 2000,
        budgetType: "LIFETIME",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-02-15"),
      },
      {
        clientId: client3.id,
        name: "February Membership Drive",
        platform: "FACEBOOK",
        objective: "Lead Generation",
        status: "ACTIVE",
        budget: 1500,
        budgetType: "DAILY",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-02-28"),
      },
    ],
    skipDuplicates: true,
  });

  console.log("Created sample campaigns");

  // Create sample leads
  await prisma.lead.createMany({
    data: [
      { clientId: client1.id, source: "LINKEDIN", name: "Alex Johnson", email: "alex@company.com", company: "BigCorp", status: "NEW", score: 85 },
      { clientId: client1.id, source: "GOOGLE_ADS", name: "Maria Garcia", email: "maria@startup.io", company: "StartupIO", status: "CONTACTED", score: 72 },
      { clientId: client2.id, source: "INSTAGRAM", name: "Emily Chen", email: "emily@email.com", status: "QUALIFIED", score: 90 },
      { clientId: client2.id, source: "FACEBOOK", name: "David Brown", email: "david@email.com", status: "CONVERTED", score: 95 },
      { clientId: client3.id, source: "FACEBOOK", name: "Lisa Wilson", email: "lisa@email.com", phone: "+1-555-0123", status: "NEW", score: 65 },
      { clientId: client3.id, source: "INSTAGRAM", name: "Tom Lee", email: "tom@email.com", status: "CONTACTED", score: 70 },
    ],
    skipDuplicates: true,
  });

  console.log("Created sample leads");

  // Create sample billing records
  await prisma.billingRecord.createMany({
    data: [
      { clientId: client1.id, type: "RETAINER", amount: 5000, period: "2026-02", status: "PAID", paidAt: new Date("2026-02-05"), description: "Monthly retainer - February 2026" },
      { clientId: client1.id, type: "AD_SPEND", amount: 3200, period: "2026-01", status: "PAID", paidAt: new Date("2026-02-01"), description: "LinkedIn Ads - January 2026" },
      { clientId: client2.id, type: "RETAINER", amount: 3000, period: "2026-02", status: "INVOICED", dueDate: new Date("2026-02-28"), description: "Monthly retainer - February 2026" },
      { clientId: client2.id, type: "AD_SPEND", amount: 1800, period: "2026-01", status: "PAID", paidAt: new Date("2026-01-31"), description: "Instagram Ads - January 2026" },
      { clientId: client3.id, type: "RETAINER", amount: 2000, period: "2026-02", status: "PENDING", dueDate: new Date("2026-02-15"), description: "Monthly retainer - February 2026" },
    ],
    skipDuplicates: true,
  });

  console.log("Created sample billing records");

  // Create sample templates
  await prisma.template.createMany({
    data: [
      {
        name: "Product Launch Announcement",
        type: "POST",
        content: "We're excited to announce {{product_name}}! {{description}} Learn more at {{link}} #{{hashtag1}} #{{hashtag2}}",
        description: "Template for new product launches",
        platforms: ["LINKEDIN", "TWITTER", "FACEBOOK"],
      },
      {
        name: "Weekly Tips Post",
        type: "POST",
        content: "{{number}} {{topic}} tips for {{audience}}:\n\n1. {{tip1}}\n2. {{tip2}}\n3. {{tip3}}\n\nWhich one are you trying first? Let us know in the comments!",
        description: "Listicle-style tips post",
        platforms: ["INSTAGRAM", "LINKEDIN", "FACEBOOK"],
      },
      {
        name: "Client Testimonial",
        type: "POST",
        content: "\"{{quote}}\" - {{client_name}}, {{client_title}} at {{client_company}}\n\nThank you for the kind words! We love helping businesses like yours grow.",
        description: "Customer testimonial highlight",
        platforms: ["LINKEDIN", "FACEBOOK", "INSTAGRAM"],
      },
    ],
    skipDuplicates: true,
  });

  console.log("Created sample templates");

  console.log("\nSeed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("  Admin:   admin@digimarketing.com / admin123");
  console.log("  Manager: manager@digimarketing.com / manager123");
  console.log("  Viewer:  viewer@digimarketing.com / viewer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
