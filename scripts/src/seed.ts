import { db, tenantsTable, usersTable, customersTable, loansTable, consentsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

function hash(p: string) { return bcrypt.hashSync(p, 10); }
function uuid() { return crypto.randomUUID(); }

async function seed() {
  console.log("Seeding database...");

  // Super admin
  const existingAdmin = await db.select().from(usersTable);
  if (existingAdmin.length > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  await db.insert(usersTable).values({
    id: uuid(),
    email: "admin@zamcredit.zm",
    passwordHash: hash("admin123"),
    name: "Super Administrator",
    role: "super_admin",
    tenantId: null,
  });

  // Tenants
  const [zanaco] = await db.insert(tenantsTable).values({
    id: uuid(),
    name: "Zanaco Bank",
    code: "ZANACO",
    type: "bank",
    status: "active",
    contactEmail: "zanaco@zamcredit.zm",
    apiKey: `zc_zanaco_${uuid()}`,
    apiCallsThisMonth: 247,
    totalQueries: 1834,
    settings: {
      scoringModel: "standard",
      maxLoanAmount: 500000,
      requireConsent: true,
      allowedDataTypes: ["bank_data", "mobile_money", "mfi_loans", "credit_history", "personal_info"],
    },
  }).returning();

  const [finca] = await db.insert(tenantsTable).values({
    id: uuid(),
    name: "FINCA Zambia",
    code: "FINCA",
    type: "mfi",
    status: "active",
    contactEmail: "finca@zamcredit.zm",
    apiKey: `zc_finca_${uuid()}`,
    apiCallsThisMonth: 132,
    totalQueries: 891,
    settings: {
      scoringModel: "conservative",
      maxLoanAmount: 50000,
      requireConsent: true,
      allowedDataTypes: ["bank_data", "mobile_money", "mfi_loans", "credit_history"],
    },
  }).returning();

  const [airtel] = await db.insert(tenantsTable).values({
    id: uuid(),
    name: "Airtel Money Zambia",
    code: "AIRTEL",
    type: "mno",
    status: "active",
    contactEmail: "airtel@zamcredit.zm",
    apiKey: `zc_airtel_${uuid()}`,
    apiCallsThisMonth: 89,
    totalQueries: 412,
    settings: {
      scoringModel: "aggressive",
      maxLoanAmount: 20000,
      requireConsent: false,
      allowedDataTypes: ["mobile_money", "credit_history"],
    },
  }).returning();

  // Tenant users
  await db.insert(usersTable).values([
    {
      id: uuid(),
      email: "zanaco@zamcredit.zm",
      passwordHash: hash("zanaco123"),
      name: "Zanaco Admin",
      role: "tenant_admin",
      tenantId: zanaco.id,
    },
    {
      id: uuid(),
      email: "finca@zamcredit.zm",
      passwordHash: hash("finca123"),
      name: "FINCA Admin",
      role: "tenant_admin",
      tenantId: finca.id,
    },
  ]);

  // Customers
  const customers = [
    {
      id: uuid(),
      nrc: "12/345678/67",
      passport: "ZM123456",
      phone: "+260977123456",
      firstName: "Chanda",
      lastName: "Mwila",
      dateOfBirth: "1985-03-15",
      email: "customer@zamcredit.zm",
      province: "Lusaka",
      consentGiven: true,
    },
    {
      id: uuid(),
      nrc: "87/654321/32",
      passport: null,
      phone: "+260966654321",
      firstName: "Mutale",
      lastName: "Bwalya",
      dateOfBirth: "1990-07-22",
      email: "mutale.bwalya@gmail.com",
      province: "Copperbelt",
      consentGiven: true,
    },
    {
      id: uuid(),
      nrc: "34/789012/45",
      passport: "ZM789012",
      phone: "+260955789012",
      firstName: "Thandiwe",
      lastName: "Phiri",
      dateOfBirth: "1995-11-08",
      email: null,
      province: "Eastern",
      consentGiven: false,
    },
    {
      id: uuid(),
      nrc: "56/111222/78",
      passport: null,
      phone: "+260944111222",
      firstName: "Joseph",
      lastName: "Lungu",
      dateOfBirth: "1978-01-30",
      email: "joseph.lungu@yahoo.com",
      province: "Southern",
      consentGiven: true,
    },
    {
      id: uuid(),
      nrc: "90/333444/12",
      passport: null,
      phone: "+260933333444",
      firstName: "Grace",
      lastName: "Tembo",
      dateOfBirth: "1988-09-14",
      email: "grace.tembo@gmail.com",
      province: "Northern",
      consentGiven: true,
    },
  ];

  const insertedCustomers = await db.insert(customersTable).values(customers).returning();

  // Customer user (linked to first customer)
  await db.insert(usersTable).values({
    id: uuid(),
    email: "customer@zamcredit.zm",
    passwordHash: hash("customer123"),
    name: "Chanda Mwila",
    role: "customer",
    tenantId: null,
  });

  // Loans
  const now = new Date();
  const loans = [
    // Chanda Mwila - good credit
    {
      customerId: insertedCustomers[0].id,
      institution: "Zanaco Bank",
      institutionType: "bank" as const,
      amount: "25000.00",
      currency: "ZMW",
      outstandingBalance: "18000.00",
      status: "active" as const,
      interestRate: "24.00",
      missedPayments: 0,
      disbursedAt: new Date(now.getTime() - 8 * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 16 * 30 * 24 * 60 * 60 * 1000),
    },
    {
      customerId: insertedCustomers[0].id,
      institution: "FINCA Zambia",
      institutionType: "mfi" as const,
      amount: "5000.00",
      currency: "ZMW",
      outstandingBalance: "0.00",
      status: "closed" as const,
      interestRate: "36.00",
      missedPayments: 0,
      disbursedAt: new Date(now.getTime() - 18 * 30 * 24 * 60 * 60 * 1000),
      dueDate: null,
    },
    // Mutale Bwalya - moderate credit
    {
      customerId: insertedCustomers[1].id,
      institution: "Stanbic Bank",
      institutionType: "bank" as const,
      amount: "40000.00",
      currency: "ZMW",
      outstandingBalance: "35000.00",
      status: "active" as const,
      interestRate: "22.00",
      missedPayments: 2,
      disbursedAt: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 9 * 30 * 24 * 60 * 60 * 1000),
    },
    {
      customerId: insertedCustomers[1].id,
      institution: "MTN Zambia",
      institutionType: "mno" as const,
      amount: "2000.00",
      currency: "ZMW",
      outstandingBalance: "800.00",
      status: "active" as const,
      interestRate: "48.00",
      missedPayments: 1,
      disbursedAt: new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 1 * 30 * 24 * 60 * 60 * 1000),
    },
    // Thandiwe Phiri - poor credit
    {
      customerId: insertedCustomers[2].id,
      institution: "Atlas Mara",
      institutionType: "bank" as const,
      amount: "15000.00",
      currency: "ZMW",
      outstandingBalance: "15000.00",
      status: "defaulted" as const,
      interestRate: "28.00",
      missedPayments: 6,
      disbursedAt: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000),
    },
    {
      customerId: insertedCustomers[2].id,
      institution: "Bayport Financial",
      institutionType: "mfi" as const,
      amount: "8000.00",
      currency: "ZMW",
      outstandingBalance: "7500.00",
      status: "defaulted" as const,
      interestRate: "40.00",
      missedPayments: 5,
      disbursedAt: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 1 * 30 * 24 * 60 * 60 * 1000),
    },
    // Joseph Lungu - good credit
    {
      customerId: insertedCustomers[3].id,
      institution: "First National Bank",
      institutionType: "bank" as const,
      amount: "80000.00",
      currency: "ZMW",
      outstandingBalance: "45000.00",
      status: "active" as const,
      interestRate: "20.00",
      missedPayments: 0,
      disbursedAt: new Date(now.getTime() - 24 * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 12 * 30 * 24 * 60 * 60 * 1000),
    },
    {
      customerId: insertedCustomers[3].id,
      institution: "FINCA Zambia",
      institutionType: "mfi" as const,
      amount: "10000.00",
      currency: "ZMW",
      outstandingBalance: "0.00",
      status: "closed" as const,
      interestRate: "36.00",
      missedPayments: 0,
      disbursedAt: new Date(now.getTime() - 36 * 30 * 24 * 60 * 60 * 1000),
      dueDate: null,
    },
    // Grace Tembo - fair credit
    {
      customerId: insertedCustomers[4].id,
      institution: "Zanaco Bank",
      institutionType: "bank" as const,
      amount: "12000.00",
      currency: "ZMW",
      outstandingBalance: "9000.00",
      status: "active" as const,
      interestRate: "26.00",
      missedPayments: 1,
      disbursedAt: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000),
    },
  ];

  await db.insert(loansTable).values(loans);

  // Consents for Chanda
  await db.insert(consentsTable).values([
    {
      customerId: insertedCustomers[0].id,
      tenantId: zanaco.id,
      dataType: "bank_data",
      status: "active",
      grantedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      customerId: insertedCustomers[0].id,
      tenantId: zanaco.id,
      dataType: "mobile_money",
      status: "active",
      grantedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      customerId: insertedCustomers[0].id,
      tenantId: zanaco.id,
      dataType: "credit_history",
      status: "active",
      grantedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      customerId: insertedCustomers[0].id,
      tenantId: finca.id,
      dataType: "mfi_loans",
      status: "active",
      grantedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("Seeding complete!");
  console.log("\nDemo credentials:");
  console.log("  Super Admin:    admin@zamcredit.zm / admin123");
  console.log("  Tenant (Zanaco): zanaco@zamcredit.zm / zanaco123");
  console.log("  Tenant (FINCA):  finca@zamcredit.zm / finca123");
  console.log("  Customer:       customer@zamcredit.zm / customer123");
  console.log("\nDemo NRC numbers:");
  console.log("  Chanda Mwila (Good):     12/345678/67");
  console.log("  Mutale Bwalya (Fair):    87/654321/32");
  console.log("  Thandiwe Phiri (Poor):   34/789012/45");
  console.log("  Joseph Lungu (Excellent): 56/111222/78");
  console.log("  Grace Tembo (Fair):      90/333444/12");
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
