const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const CLIENTS = [
  {
    "name": "&#10;AFS (2522)&#10;",
    "email": "10.afs.2522.10@seed.local"
  },
  {
    "name": "Able Steel (295)",
    "email": "able.steel.295@seed.local"
  },
  {
    "name": "Able Steel (24-12)",
    "email": "able.steel.24.12@seed.local"
  },
  {
    "name": "Able Steel (297)",
    "email": "able.steel.297@seed.local"
  },
  {
    "name": "Able Steel (298)",
    "email": "able.steel.298@seed.local"
  },
  {
    "name": "Able Steel (304)",
    "email": "able.steel.304@seed.local"
  },
  {
    "name": "Able Steel (300)",
    "email": "able.steel.300@seed.local"
  },
  {
    "name": "Able steel (301)",
    "email": "able.steel.301@seed.local"
  },
  {
    "name": "Able Steel (280)",
    "email": "able.steel.280@seed.local"
  },
  {
    "name": "AF Steel (2521)",
    "email": "af.steel.2521@seed.local"
  },
  {
    "name": "AFS (2504)",
    "email": "afs.2504@seed.local"
  },
  {
    "name": "AFS (2517)",
    "email": "afs.2517@seed.local"
  },
  {
    "name": "AFS (2512)",
    "email": "afs.2512@seed.local"
  },
  {
    "name": "AFS (2525)",
    "email": "afs.2525@seed.local"
  },
  {
    "name": "AFS (2427)",
    "email": "afs.2427@seed.local"
  },
  {
    "name": "AFS (2507)",
    "email": "afs.2507@seed.local"
  },
  {
    "name": "AFS (2526)",
    "email": "afs.2526@seed.local"
  },
  {
    "name": "AFS (2505)",
    "email": "afs.2505@seed.local"
  },
  {
    "name": "AFS (2510)",
    "email": "afs.2510@seed.local"
  },
  {
    "name": "AFS (2415)",
    "email": "afs.2415@seed.local"
  }
];
const TL_USERS = [
  {
    "name": "Aman",
    "email": "aman@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Azhar",
    "email": "azhar@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Gaurav",
    "email": "gaurav@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Koshal Kapil",
    "email": "koshal.kapil@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Manoj",
    "email": "manoj@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Nischal",
    "email": "nischal@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Prashant",
    "email": "prashant@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Sanoj",
    "email": "sanoj@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Utkarsh",
    "email": "utkarsh@example.com",
    "userType": "employee",
    "password": "water"
  }
];
const CLIENT_USERS = [
  {
    "name": "&#10;AFS (2522)&#10; Client",
    "email": "10.afs.2522.10.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "&#10;AFS (2522)&#10;"
  },
  {
    "name": "Able Steel (295) Client",
    "email": "able.steel.295.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel (295)"
  },
  {
    "name": "Able Steel (24-12) Client",
    "email": "able.steel.24.12.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel (24-12)"
  },
  {
    "name": "Able Steel (297) Client",
    "email": "able.steel.297.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel (297)"
  },
  {
    "name": "Able Steel (298) Client",
    "email": "able.steel.298.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel (298)"
  },
  {
    "name": "Able Steel (304) Client",
    "email": "able.steel.304.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel (304)"
  },
  {
    "name": "Able Steel (300) Client",
    "email": "able.steel.300.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel (300)"
  },
  {
    "name": "Able steel (301) Client",
    "email": "able.steel.301.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able steel (301)"
  },
  {
    "name": "Able Steel (280) Client",
    "email": "able.steel.280.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel (280)"
  },
  {
    "name": "AF Steel (2521) Client",
    "email": "af.steel.2521.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AF Steel (2521)"
  },
  {
    "name": "AFS (2504) Client",
    "email": "afs.2504.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2504)"
  },
  {
    "name": "AFS (2517) Client",
    "email": "afs.2517.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2517)"
  },
  {
    "name": "AFS (2512) Client",
    "email": "afs.2512.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2512)"
  },
  {
    "name": "AFS (2525) Client",
    "email": "afs.2525.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2525)"
  },
  {
    "name": "AFS (2427) Client",
    "email": "afs.2427.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2427)"
  },
  {
    "name": "AFS (2507) Client",
    "email": "afs.2507.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2507)"
  },
  {
    "name": "AFS (2526) Client",
    "email": "afs.2526.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2526)"
  },
  {
    "name": "AFS (2505) Client",
    "email": "afs.2505.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2505)"
  },
  {
    "name": "AFS (2510) Client",
    "email": "afs.2510.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2510)"
  },
  {
    "name": "AFS (2415) Client",
    "email": "afs.2415.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS (2415)"
  }
];
const PROJECTS = [
  {
    "projectNo": "PRJ0001",
    "name": "APS-TSMC (25310)",
    "clientName": "&#10;AFS (2522)&#10;",
    "solTLName": "Prashant",
    "projectDataFolder": "/projects/data-warehouse/aps-tsmc-25310"
  },
  {
    "projectNo": "PRJ0002",
    "name": "Banner Desert (24404)",
    "clientName": "Able Steel (295)",
    "solTLName": "Nischal",
    "projectDataFolder": "/projects/data-warehouse/banner-desert-24404"
  },
  {
    "projectNo": "PRJ0003",
    "name": "SWA Hanger (25011)",
    "clientName": "Able Steel (24-12)",
    "solTLName": "Nischal",
    "projectDataFolder": "/projects/data-warehouse/swa-hanger-25011"
  },
  {
    "projectNo": "PRJ0004",
    "name": "Signal Butte (25024)",
    "clientName": "Able Steel (297)",
    "solTLName": "Nischal",
    "projectDataFolder": "/projects/data-warehouse/signal-butte-25024"
  },
  {
    "projectNo": "PRJ0005",
    "name": "CAP Water (25086)",
    "clientName": "Able Steel (298)",
    "solTLName": "Nischal",
    "projectDataFolder": "/projects/data-warehouse/cap-water-25086"
  },
  {
    "projectNo": "PRJ0006",
    "name": "Encompass Health (25245)",
    "clientName": "Able Steel (304)",
    "solTLName": "Nischal",
    "projectDataFolder": "/projects/data-warehouse/encompass-health-25245"
  },
  {
    "projectNo": "PRJ0007",
    "name": "CRMC ACC Building MOB II (25272)",
    "clientName": "Able Steel (300)",
    "solTLName": "Nischal",
    "projectDataFolder": "/projects/data-warehouse/crmc-acc-building-mob-ii-25272"
  },
  {
    "projectNo": "PRJ0008",
    "name": "CSA Auxiliary (25212)",
    "clientName": "Able steel (301)",
    "solTLName": "Koshal Kapil",
    "projectDataFolder": "/projects/data-warehouse/csa-auxiliary-25212"
  },
  {
    "projectNo": "PRJ0009",
    "name": "Scripps (23268)",
    "clientName": "Able Steel (280)",
    "solTLName": "Azhar",
    "projectDataFolder": "/projects/data-warehouse/scripps-23268"
  },
  {
    "projectNo": "PRJ0010",
    "name": "Desert Palm (25304)",
    "clientName": "AF Steel (2521)",
    "solTLName": "Aman",
    "projectDataFolder": "/projects/data-warehouse/desert-palm-25304"
  },
  {
    "projectNo": "PRJ0011",
    "name": "Astria (25100)",
    "clientName": "AFS (2504)",
    "solTLName": "Gaurav",
    "projectDataFolder": "/projects/data-warehouse/astria-25100"
  },
  {
    "projectNo": "PRJ0012",
    "name": "USACE Area Maintenance (25241)",
    "clientName": "AFS (2517)",
    "solTLName": "Gaurav",
    "projectDataFolder": "/projects/data-warehouse/usace-area-maintenance-25241"
  },
  {
    "projectNo": "PRJ0013",
    "name": "Dicks House (25157)",
    "clientName": "AFS (2512)",
    "solTLName": "Prashant",
    "projectDataFolder": "/projects/data-warehouse/dicks-house-25157"
  },
  {
    "projectNo": "PRJ0014",
    "name": "QTS PHX3-DC1 (25329)",
    "clientName": "AFS (2525)",
    "solTLName": "Prashant",
    "projectDataFolder": "/projects/data-warehouse/qts-phx3-dc1-25329"
  },
  {
    "projectNo": "PRJ0015",
    "name": "AFD (24260)",
    "clientName": "AFS (2427)",
    "solTLName": "Manoj",
    "projectDataFolder": "/projects/data-warehouse/afd-24260"
  },
  {
    "projectNo": "PRJ0016",
    "name": "Buckeye T2944 (25119)",
    "clientName": "AFS (2507)",
    "solTLName": "Sanoj",
    "projectDataFolder": "/projects/data-warehouse/buckeye-t2944-25119"
  },
  {
    "projectNo": "PRJ0017",
    "name": "TPK Cath Lab (25334)",
    "clientName": "AFS (2526)",
    "solTLName": "Sanoj",
    "projectDataFolder": "/projects/data-warehouse/tpk-cath-lab-25334"
  },
  {
    "projectNo": "PRJ0018",
    "name": "Pecos Bldg C&D (25118)",
    "clientName": "AFS (2505)",
    "solTLName": "Aman",
    "projectDataFolder": "/projects/data-warehouse/pecos-bldg-c-d-25118"
  },
  {
    "projectNo": "PRJ0019",
    "name": "TSMC HQ Office bldg (25149)",
    "clientName": "AFS (2510)",
    "solTLName": "Aman",
    "projectDataFolder": "/projects/data-warehouse/tsmc-hq-office-bldg-25149"
  },
  {
    "projectNo": "PRJ0020",
    "name": "1020 Apache (24141)",
    "clientName": "AFS (2415)",
    "solTLName": "Utkarsh",
    "projectDataFolder": "/projects/data-warehouse/1020-apache-24141"
  }
];

async function ensureClient(c) {
  return prisma.client.upsert({
    where: { email: c.email },
    update: { name: c.name },
    create: { name: c.name, email: c.email, configuration: {}, ccListData: [], folderStructure: {} },
  });
}

async function ensureUser(u, clientId = null) {
  const hashed = await bcrypt.hash(u.password, 10);
  return prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, userType: u.userType, clientId },
    create: { name: u.name, email: u.email, password: hashed, userType: u.userType, clientId },
  });
}

async function upsertProject(p) {
  const client = await prisma.client.findFirst({ where: { name: p.clientName } });
  if (!client) throw new Error(`Client not found: ${p.clientName}`);
  const tl = p.solTLName ? await prisma.user.findFirst({ where: { name: p.solTLName } }) : null;

  return prisma.project.upsert({
    where: { projectNo: p.projectNo },
    update: {},
    create: {
      projectNo: p.projectNo,
      name: p.name,
      clientId: client.id,
      solTLId: tl ? tl.id : null,
      projectDataFolder: p.projectDataFolder,
      estimationRows: [],
    }
  });
}

async function ensureSeedDoc(project) {
  const exists = await prisma.documentLog.findFirst({ where: { projectId: project.id, logType: 'seed' } });
  if (exists) return exists;
  return prisma.documentLog.create({
    data: {
      fileName: `${project.projectNo}_init.txt`,
      clientId: project.clientId,
      projectId: project.id,
      storagePath: `${project.projectDataFolder}/init.txt`,
      size: 0,
      logType: 'seed',
    }
  });
}

async function main() {
  const clientMap = new Map();
  for (const c of CLIENTS) { clientMap.set(c.name, await ensureClient(c)); }
  for (const u of TL_USERS) { await ensureUser(u, null); }
  for (const cu of CLIENT_USERS) { const client = clientMap.get(cu.clientName); await ensureUser(cu, client?.id ?? null); }
  for (const p of PROJECTS) { const proj = await upsertProject(p); await ensureSeedDoc(proj); }

  console.log('✅ Seed complete', {
    clients: CLIENTS.length, tlUsers: TL_USERS.length, clientUsers: CLIENT_USERS.length, projects: PROJECTS.length
  });
}

main().catch(e => { console.error('❌ Seeding error:', e); process.exit(1); })
      .finally(async () => { await prisma.$disconnect(); });
