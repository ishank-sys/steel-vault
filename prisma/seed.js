const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Seed Clients
  const clients = [
    {
      name: "Client One",
      email: "client1@example.com",
      companyName: "Acme Corp",
      contactNo: "1234567890",
      address: "123 Main St, City",
      configuration: { currency: "USD", timezone: "EST" },
      ccListData: [{ name: "Manager A", email: "managerA@acme.com" }],
      folderStructure: { root: ["docs", "invoices"] },
    },
    {
      name: "Client Two",
      email: "client2@example.com",
      companyName: "Beta Ltd",
      contactNo: "9876543210",
      address: "456 Side Rd, Town",
      configuration: { currency: "EUR", timezone: "CET" },
      ccListData: [{ name: "Manager B", email: "managerB@beta.com" }],
      folderStructure: { root: ["contracts", "reports"] },
    },
    {
      name: "Client Three",
      email: "client3@example.com",
      companyName: "Gamma Inc",
      contactNo: "1112223333",
      address: "789 Elm St, Village",
      configuration: { currency: "GBP", timezone: "GMT" },
      ccListData: [{ name: "Manager C", email: "managerC@gamma.com" }],
      folderStructure: { root: ["blueprints", "rfqs"] },
    },
    {
      name: "Client Four",
      email: "client4@example.com",
      companyName: "Delta Solutions",
      contactNo: "4445556666",
      address: "321 Oak St, Metro",
      configuration: { currency: "INR", timezone: "IST" },
      ccListData: [{ name: "Manager D", email: "managerD@delta.com" }],
      folderStructure: { root: ["plans", "drawings"] },
    },
  ];

  const clientRecords = [];
  for (const client of clients) {
    const createdClient = await prisma.client.upsert({
      where: { email: client.email },
      update: {},
      create: client,
    });
    clientRecords.push(createdClient);
  }

  // Seed Users
  const users = [
    { name: "Test Employee", email: "employee1@example.com", password: await bcrypt.hash('water', 10), userType: "employee" },
    { name: "Admin User", email: "admin@example.com", password: await bcrypt.hash('admin123', 10), userType: "admin" },
    { name: "Employee Two", email: "employee2@example.com", password: await bcrypt.hash('water', 10), userType: "employee" },

    { name: "Client User 1", email: "clientuser1@example.com", password: await bcrypt.hash('water', 10), userType: "client", clientId: clientRecords[0].id },
    { name: "Client User 2", email: "clientuser2@example.com", password: await bcrypt.hash('water', 10), userType: "client", clientId: clientRecords[1].id },
    { name: "Client User 3", email: "clientuser3@example.com", password: await bcrypt.hash('water', 10), userType: "client", clientId: clientRecords[2].id },
    { name: "Client User 4", email: "clientuser4@example.com", password: await bcrypt.hash('water', 10), userType: "client", clientId: clientRecords[3].id },
    { name: "Support Staff", email: "support@example.com", password: await bcrypt.hash('support123', 10), userType: "employee" },
  ];

  const userRecords = [];
  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    userRecords.push(createdUser);
  }

  // Collect employee users to assign as solTL
  const employeeUsers = userRecords.filter(u => u.userType === 'employee');
  if (employeeUsers.length === 0) {
    throw new Error('No employee users found to assign as solTL');
  }

  // Seed Projects
  const projects = [
  { projectNo: "PRJ001", name: "Website Revamp", description: "Corporate website redesign", clientId: clientRecords[0].id, estimatedBy: "Test Employee", fabricatorName: "Fabricator A", fabricatorJobNo: "FAB123", solJobNo: "SOL456", jobName: "Revamp Job", projectType: "Redesign", projectSubType: "Website", solTLId: employeeUsers[0].id, fabricatorPMName: "PM A", weightTonnage: "10", latestSubmission: new Date(), projectDataFolder: "/projects/website-revamp" },
  { projectNo: "PRJ002", name: "Mobile App", description: "Beta client mobile app", clientId: clientRecords[1].id, estimatedBy: "Employee Two", fabricatorName: "Fabricator B", fabricatorJobNo: "FAB789", solJobNo: "SOL987", jobName: "App Job", projectType: "Development", projectSubType: "Mobile App", solTLId: employeeUsers[1 % employeeUsers.length].id, fabricatorPMName: "PM B", weightTonnage: "5", latestSubmission: new Date(), projectDataFolder: "/projects/mobile-app" },
  { projectNo: "PRJ003", name: "ERP System", description: "ERP implementation", clientId: clientRecords[2].id, estimatedBy: "Admin User", fabricatorName: "Fabricator C", fabricatorJobNo: "FAB111", solJobNo: "SOL222", jobName: "ERP Job", projectType: "Implementation", projectSubType: "ERP", solTLId: employeeUsers[2 % employeeUsers.length].id, fabricatorPMName: "PM C", weightTonnage: "8", latestSubmission: new Date(), projectDataFolder: "/projects/erp-system" },
  { projectNo: "PRJ004", name: "E-Commerce Platform", description: "Delta Solutions marketplace build", clientId: clientRecords[3].id, estimatedBy: "Support Staff", fabricatorName: "Fabricator D", fabricatorJobNo: "FAB222", solJobNo: "SOL333", jobName: "Ecom Job", projectType: "Development", projectSubType: "E-Commerce", solTLId: employeeUsers[3 % employeeUsers.length].id, fabricatorPMName: "PM D", weightTonnage: "15", latestSubmission: new Date(), projectDataFolder: "/projects/ecommerce" },
  { projectNo: "PRJ005", name: "CRM Migration", description: "Acme CRM to Salesforce", clientId: clientRecords[0].id, estimatedBy: "Employee Two", fabricatorName: "Fabricator A2", fabricatorJobNo: "FAB444", solJobNo: "SOL555", jobName: "CRM Job", projectType: "Migration", projectSubType: "CRM", solTLId: employeeUsers[4 % employeeUsers.length].id, fabricatorPMName: "PM A2", weightTonnage: "3", latestSubmission: new Date(), projectDataFolder: "/projects/crm-migration" },
  { projectNo: "PRJ006", name: "Data Warehouse", description: "Gamma Inc. analytics platform", clientId: clientRecords[2].id, estimatedBy: "Admin User", fabricatorName: "Fabricator E", fabricatorJobNo: "FAB555", solJobNo: "SOL666", jobName: "DW Job", projectType: "Analytics", projectSubType: "Data Warehouse", solTLId: employeeUsers[5 % employeeUsers.length].id, fabricatorPMName: "PM E", weightTonnage: "12", latestSubmission: new Date(), projectDataFolder: "/projects/data-warehouse" },
  ];

  const projectRecords = [];
  for (const project of projects) {
    const createdProject = await prisma.project.upsert({
      where: { projectNo: project.projectNo },
      update: {},
      create: project,
    });
    projectRecords.push(createdProject);
  }

  // Seed Document Logs
  const documentLogs = [
    { fileName: "requirements.pdf", clientId: clientRecords[0].id, projectId: projectRecords[0].id, storagePath: "/docs/requirements.pdf", size: 2048, logType: "UPLOAD_NEW" },
    { fileName: "design-specs.docx", clientId: clientRecords[1].id, projectId: projectRecords[1].id, storagePath: "/docs/design-specs.docx", size: 4096, logType: "UPLOAD_NEW" },
    { fileName: "erp-blueprint.xlsx", clientId: clientRecords[2].id, projectId: projectRecords[2].id, storagePath: "/docs/erp-blueprint.xlsx", size: 10240, logType: "UPLOAD_NEW" },
    { fileName: "marketplace-plan.pdf", clientId: clientRecords[3].id, projectId: projectRecords[3].id, storagePath: "/docs/marketplace-plan.pdf", size: 5120, logType: "UPLOAD_NEW" },
    { fileName: "crm-data-migration.csv", clientId: clientRecords[0].id, projectId: projectRecords[4].id, storagePath: "/docs/crm-data-migration.csv", size: 3072, logType: "UPLOAD_NEW" },
    { fileName: "dw-architecture.pptx", clientId: clientRecords[2].id, projectId: projectRecords[5].id, storagePath: "/docs/dw-architecture.pptx", size: 8192, logType: "UPLOAD_NEW" },
  ];

  for (const doc of documentLogs) {
    await prisma.documentLog.create({ data: doc });
  }

  console.log("✅ Seeding completed successfully with extended dataset!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
