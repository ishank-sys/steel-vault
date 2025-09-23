const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const BASE_FOLDER = '/projects/data-warehouse';

const CLIENTS = [
  {
    "name": "S&H",
    "email": "s.h@seed.local"
  },
  {
    "name": "Amber",
    "email": "amber@seed.local"
  },
  {
    "name": "Myrex",
    "email": "myrex@seed.local"
  },
  {
    "name": "AFS",
    "email": "afs@seed.local"
  },
  {
    "name": "MMI",
    "email": "mmi@seed.local"
  },
  {
    "name": "Anderson",
    "email": "anderson@seed.local"
  },
  {
    "name": "Sampson",
    "email": "sampson@seed.local"
  },
  {
    "name": "KCSS",
    "email": "kcss@seed.local"
  },
  {
    "name": "Metal Works",
    "email": "metal.works@seed.local"
  },
  {
    "name": "Able Steel",
    "email": "able.steel@seed.local"
  }
];
const TL_USERS = [
  {
    "name": "admin",
    "email": "admin@example.com",
    "userType": "admin",
    "password": "water"
  },
  {
    "name": "Alok",
    "email": "alok@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Aman",
    "email": "aman@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Anjan",
    "email": "anjan@example.com",
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
    "name": "Kuldeep",
    "email": "kuldeep@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Kumar Abhishek",
    "email": "kumar.abhishek@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "LD Sharma",
    "email": "ld.sharma@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Lokesh",
    "email": "lokesh@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Mahesh",
    "email": "mahesh@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Mahesh Teli",
    "email": "mahesh.teli@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Maity",
    "email": "maity@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Manju",
    "email": "manju@example.com",
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
    "name": "Prashanth",
    "email": "prashanth@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Rajkumar",
    "email": "rajkumar@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Rajkumar/shubham",
    "email": "rajkumar.shubham@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Sajith",
    "email": "sajith@example.com",
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
    "name": "Satpal",
    "email": "satpal@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Shahzeb",
    "email": "shahzeb@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Shibu K",
    "email": "shibu.k@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Shubham",
    "email": "shubham@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Shyju",
    "email": "shyju@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Shynu",
    "email": "shynu@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Somnath",
    "email": "somnath@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Sumit",
    "email": "sumit@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Utkarsh",
    "email": "utkarsh@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Vinay",
    "email": "vinay@example.com",
    "userType": "employee",
    "password": "water"
  },
  {
    "name": "Vrishabh",
    "email": "vrishabh@example.com",
    "userType": "employee",
    "password": "water"
  }
];
const CLIENT_USERS = [
  {
    "name": "S&H Client",
    "email": "s.h.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "S&H"
  },
  {
    "name": "Amber Client",
    "email": "amber.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Amber"
  },
  {
    "name": "Myrex Client",
    "email": "myrex.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Myrex"
  },
  {
    "name": "AFS Client",
    "email": "afs.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "AFS"
  },
  {
    "name": "MMI Client",
    "email": "mmi.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "MMI"
  },
  {
    "name": "Anderson Client",
    "email": "anderson.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Anderson"
  },
  {
    "name": "Sampson Client",
    "email": "sampson.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Sampson"
  },
  {
    "name": "KCSS Client",
    "email": "kcss.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "KCSS"
  },
  {
    "name": "Metal Works Client",
    "email": "metal.works.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Metal Works"
  },
  {
    "name": "Able Steel Client",
    "email": "able.steel.client@example.com",
    "userType": "client",
    "password": "water",
    "clientName": "Able Steel"
  }
];
const PROJECTS = [
  {
    "projectNo": "24404",
    "name": "Banner Desert",
    "clientName": "Able Steel",
    "solTLName": "Nischal",
    "clientSideProjectNo": "295",
    "startDateISO": "2024-12-05",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/banner-desert"
  },
  {
    "projectNo": "25011",
    "name": "SWA Hanger",
    "clientName": "Able Steel",
    "solTLName": "Nischal",
    "clientSideProjectNo": "24-12",
    "startDateISO": "2025-03-26",
    "endDateISO": "2025-04-17",
    "projectDataFolder": "/projects/data-warehouse/swa-hanger"
  },
  {
    "projectNo": "25024",
    "name": "Signal Butte",
    "clientName": "Able Steel",
    "solTLName": "Nischal",
    "clientSideProjectNo": "297",
    "startDateISO": "2025-08-20",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/signal-butte"
  },
  {
    "projectNo": "25086",
    "name": "CAP Water",
    "clientName": "Able Steel",
    "solTLName": "Nischal",
    "clientSideProjectNo": "298",
    "startDateISO": "2025-09-12",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/cap-water"
  },
  {
    "projectNo": "25245",
    "name": "Encompass Health",
    "clientName": "Able Steel",
    "solTLName": "Nischal",
    "clientSideProjectNo": "304",
    "startDateISO": "2025-09-03",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/encompass-health"
  },
  {
    "projectNo": "25272",
    "name": "CRMC ACC Building MOB II",
    "clientName": "Able Steel",
    "solTLName": "Nischal",
    "clientSideProjectNo": "300",
    "startDateISO": "2025-07-21",
    "endDateISO": "2025-08-28",
    "projectDataFolder": "/projects/data-warehouse/crmc-acc-building-mob-ii"
  },
  {
    "projectNo": "23268",
    "name": "Scripps",
    "clientName": "Able Steel",
    "solTLName": "Azhar",
    "clientSideProjectNo": "280",
    "startDateISO": "2023-09-29",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/scripps"
  },
  {
    "projectNo": "25100",
    "name": "Astria",
    "clientName": "AFS",
    "solTLName": "Gaurav",
    "clientSideProjectNo": "2504",
    "startDateISO": "2025-06-04",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/astria"
  },
  {
    "projectNo": "25241",
    "name": "USACE Area Maintenance",
    "clientName": "AFS",
    "solTLName": "Gaurav",
    "clientSideProjectNo": "2517",
    "startDateISO": "2025-06-20",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/usace-area-maintenance"
  },
  {
    "projectNo": "25157",
    "name": "Dicks House",
    "clientName": "AFS",
    "solTLName": "Prashant",
    "clientSideProjectNo": "2512",
    "startDateISO": "2025-04-30",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/dicks-house"
  },
  {
    "projectNo": "25329",
    "name": "QTS PHX3-DC1",
    "clientName": "AFS",
    "solTLName": "Prashant",
    "clientSideProjectNo": "2525",
    "startDateISO": "2025-08-21",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/qts-phx3-dc1"
  },
  {
    "projectNo": "24260",
    "name": "AFD",
    "clientName": "AFS",
    "solTLName": "Manoj",
    "clientSideProjectNo": "2427",
    "startDateISO": "2024-08-30",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/afd"
  },
  {
    "projectNo": "25119",
    "name": "Buckeye T2944",
    "clientName": "AFS",
    "solTLName": "Sanoj",
    "clientSideProjectNo": "2507",
    "startDateISO": "2025-05-14",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/buckeye-t2944"
  },
  {
    "projectNo": "25334",
    "name": "TPK Cath Lab",
    "clientName": "AFS",
    "solTLName": "Sanoj",
    "clientSideProjectNo": "2526",
    "startDateISO": "2025-09-17",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/tpk-cath-lab"
  },
  {
    "projectNo": "25118",
    "name": "Pecos Bldg C&D",
    "clientName": "AFS",
    "solTLName": "Aman",
    "clientSideProjectNo": "2505",
    "startDateISO": "2025-04-17",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/pecos-bldg-c-d"
  },
  {
    "projectNo": "25149",
    "name": "TSMC HQ Office bldg",
    "clientName": "AFS",
    "solTLName": "Aman",
    "clientSideProjectNo": "2510",
    "startDateISO": "2025-08-19",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/tsmc-hq-office-bldg"
  },
  {
    "projectNo": "24141",
    "name": "1020 Apache",
    "clientName": "AFS",
    "solTLName": "Utkarsh",
    "clientSideProjectNo": "2415",
    "startDateISO": "2025-08-07",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/1020-apache"
  },
  {
    "projectNo": "25246",
    "name": "TSMC Sundt",
    "clientName": "AFS",
    "solTLName": "Utkarsh",
    "clientSideProjectNo": "2518",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/tsmc-sundt"
  },
  {
    "projectNo": "25203",
    "name": "Chandler",
    "clientName": "AFS",
    "solTLName": "Lokesh",
    "clientSideProjectNo": "2515",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/chandler"
  },
  {
    "projectNo": "25108",
    "name": "Porter Brothers",
    "clientName": "Amber",
    "solTLName": "Maity",
    "clientSideProjectNo": "25-216",
    "startDateISO": "2025-08-12",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/porter-brothers"
  },
  {
    "projectNo": "22082",
    "name": "Farmington &#10;",
    "clientName": "Amber",
    "solTLName": "Prashant",
    "clientSideProjectNo": "22-306",
    "startDateISO": "2022-07-14",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/farmington-10"
  },
  {
    "projectNo": "24273",
    "name": "Peoria Home",
    "clientName": "Amber",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "24-075",
    "startDateISO": "2024-09-06",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/peoria-home"
  },
  {
    "projectNo": "24376",
    "name": "Mesa Gallery Park",
    "clientName": "Amber",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "25-202",
    "startDateISO": "2024-11-29",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/mesa-gallery-park"
  },
  {
    "projectNo": "25168",
    "name": "PCDS Music",
    "clientName": "Amber",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "25-229",
    "startDateISO": "2025-05-07",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/pcds-music"
  },
  {
    "projectNo": "25243",
    "name": "Maricopa Gym",
    "clientName": "Amber",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "25-244",
    "startDateISO": "2025-08-01",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/maricopa-gym"
  },
  {
    "projectNo": "25258",
    "name": "SMOW Auditorium",
    "clientName": "Amber",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "25-246",
    "startDateISO": "2025-06-27",
    "endDateISO": "2025-07-08",
    "projectDataFolder": "/projects/data-warehouse/smow-auditorium"
  },
  {
    "projectNo": "24275",
    "name": "Springhill Suites",
    "clientName": "Amber",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "24-085",
    "startDateISO": "2024-09-09",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/springhill-suites"
  },
  {
    "projectNo": "25124",
    "name": "Kyrene District",
    "clientName": "Amber",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "23-643",
    "startDateISO": "2025-03-24",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/kyrene-district"
  },
  {
    "projectNo": "25139",
    "name": "Mesa Fire",
    "clientName": "Amber",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "25-221",
    "startDateISO": "2025-04-17",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/mesa-fire"
  },
  {
    "projectNo": "25180",
    "name": "Laveen Elementary",
    "clientName": "Amber",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "25-234",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/laveen-elementary"
  },
  {
    "projectNo": "24369",
    "name": "EAC Cosmo",
    "clientName": "Amber",
    "solTLName": "LD Sharma",
    "clientSideProjectNo": "25-200",
    "startDateISO": "2025-04-10",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/eac-cosmo"
  },
  {
    "projectNo": "25123",
    "name": "Falcon Field",
    "clientName": "Amber",
    "solTLName": "LD Sharma",
    "clientSideProjectNo": "25-219",
    "startDateISO": "2025-03-28",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/falcon-field"
  },
  {
    "projectNo": "25131",
    "name": "59th and Elliot",
    "clientName": "Amber",
    "solTLName": "LD Sharma",
    "clientSideProjectNo": "25-220",
    "startDateISO": "2025-04-10",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/59th-and-elliot"
  },
  {
    "projectNo": "25164",
    "name": "Komatsu Sales",
    "clientName": "Amber",
    "solTLName": "LD Sharma",
    "clientSideProjectNo": "25-227",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/komatsu-sales"
  },
  {
    "projectNo": "25028",
    "name": "Thatcher Marriot",
    "clientName": "Amber",
    "solTLName": "Shibu K",
    "clientSideProjectNo": "24-210",
    "startDateISO": "2025-02-11",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/thatcher-marriot"
  },
  {
    "projectNo": "25352",
    "name": "Queen Creek",
    "clientName": "Amber",
    "solTLName": "Shibu K",
    "clientSideProjectNo": "25-259",
    "startDateISO": "2025-09-05",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/queen-creek"
  },
  {
    "projectNo": "25375",
    "name": "Mesa Fairfield",
    "clientName": "Amber",
    "solTLName": "Shibu K",
    "clientSideProjectNo": "25-264",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/mesa-fairfield"
  },
  {
    "projectNo": "25192",
    "name": "Ketchikan Airport",
    "clientName": "Anderson",
    "solTLName": "Satpal",
    "clientSideProjectNo": "2519",
    "startDateISO": "2025-07-17",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ketchikan-airport"
  },
  {
    "projectNo": "25256",
    "name": "Smiths #210",
    "clientName": "Anderson",
    "solTLName": "Satpal",
    "clientSideProjectNo": "2522",
    "startDateISO": "2025-07-07",
    "endDateISO": "2025-09-17",
    "projectDataFolder": "/projects/data-warehouse/smiths-210"
  },
  {
    "projectNo": "25184",
    "name": "USCG Base",
    "clientName": "Anderson",
    "solTLName": "Somnath",
    "clientSideProjectNo": "2517",
    "startDateISO": "2025-05-12",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/uscg-base"
  },
  {
    "projectNo": "25331",
    "name": "Independence Bank",
    "clientName": "Anderson",
    "solTLName": "Somnath",
    "clientSideProjectNo": "2528",
    "startDateISO": "2025-08-21",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/independence-bank"
  },
  {
    "projectNo": "24079",
    "name": "Great Falls",
    "clientName": "Anderson",
    "solTLName": "Maity",
    "clientSideProjectNo": "2408",
    "startDateISO": "2025-02-07",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/great-falls"
  },
  {
    "projectNo": "25069",
    "name": "First Interstate",
    "clientName": "Anderson",
    "solTLName": "Maity",
    "clientSideProjectNo": "2503",
    "startDateISO": "2025-02-28",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/first-interstate"
  },
  {
    "projectNo": "25283",
    "name": "Providence Health",
    "clientName": "Anderson",
    "solTLName": "Maity",
    "clientSideProjectNo": "2521",
    "startDateISO": "2025-08-01",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/providence-health"
  },
  {
    "projectNo": "25019",
    "name": "Salvation Army",
    "clientName": "Anderson",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "2454",
    "startDateISO": "2025-02-28",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/salvation-army"
  },
  {
    "projectNo": "25320",
    "name": "Main Entrance Revision",
    "clientName": "Anderson",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "2526",
    "startDateISO": "2025-09-12",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/main-entrance-revision"
  },
  {
    "projectNo": "25344",
    "name": "FY2 Complex",
    "clientName": "Anderson",
    "solTLName": "Shibu K",
    "clientSideProjectNo": "2529",
    "startDateISO": "2025-09-02",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/fy2-complex"
  },
  {
    "projectNo": "25353",
    "name": "ADC2A Skids",
    "clientName": "KCSS",
    "solTLName": "Manoj",
    "clientSideProjectNo": "25021",
    "startDateISO": "2025-09-02",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/adc2a-skids"
  },
  {
    "projectNo": "25128",
    "name": "Ford stamping",
    "clientName": "KCSS",
    "solTLName": "Prashanth",
    "clientSideProjectNo": "25007",
    "startDateISO": "2025-04-03",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ford-stamping"
  },
  {
    "projectNo": "25339",
    "name": "Owens Corning",
    "clientName": "KCSS",
    "solTLName": "Prashanth",
    "clientSideProjectNo": "25020",
    "startDateISO": "2025-09-05",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/owens-corning"
  },
  {
    "projectNo": "23388",
    "name": "American Royal",
    "clientName": "KCSS",
    "solTLName": "Mahesh Teli",
    "clientSideProjectNo": "23018",
    "startDateISO": "2024-06-28",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/american-royal"
  },
  {
    "projectNo": "24177",
    "name": "Nelson WWTP",
    "clientName": "KCSS",
    "solTLName": "Mahesh Teli",
    "clientSideProjectNo": "24030",
    "startDateISO": "2024-09-12",
    "endDateISO": "2024-10-21",
    "projectDataFolder": "/projects/data-warehouse/nelson-wwtp"
  },
  {
    "projectNo": "24143",
    "name": "BSSD Center",
    "clientName": "KCSS",
    "solTLName": "Anjan",
    "clientSideProjectNo": "24025",
    "startDateISO": "2024-07-03",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/bssd-center"
  },
  {
    "projectNo": "24359",
    "name": "UMKC Health Science",
    "clientName": "KCSS",
    "solTLName": "Manju",
    "clientSideProjectNo": "24051",
    "startDateISO": "2025-01-15",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/umkc-health-science"
  },
  {
    "projectNo": "25055",
    "name": "Smithville",
    "clientName": "KCSS",
    "solTLName": "Vinay",
    "clientSideProjectNo": "25005",
    "startDateISO": "2025-03-14",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/smithville"
  },
  {
    "projectNo": "25336",
    "name": "Ravenswood New District Office",
    "clientName": "Metal Works",
    "solTLName": "Azhar",
    "clientSideProjectNo": "031849",
    "startDateISO": "2025-08-25",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ravenswood-new-district-office"
  },
  {
    "projectNo": "24158",
    "name": "Murray",
    "clientName": "Metal Works",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "030693",
    "startDateISO": "2024-06-11",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/murray"
  },
  {
    "projectNo": "24191",
    "name": "UC Davis",
    "clientName": "Metal Works",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "029989",
    "startDateISO": "2024-11-28",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/uc-davis"
  },
  {
    "projectNo": "24408",
    "name": "Silver Dollar",
    "clientName": "Metal Works",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "031140",
    "startDateISO": "2025-01-22",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/silver-dollar"
  },
  {
    "projectNo": "25252",
    "name": "Caltrans Westbound",
    "clientName": "Metal Works",
    "solTLName": "Mahesh",
    "clientSideProjectNo": "031250",
    "startDateISO": "2025-08-25",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/caltrans-westbound"
  },
  {
    "projectNo": "24222",
    "name": "Seneca Critical",
    "clientName": "Metal Works",
    "solTLName": "Shibu K",
    "clientSideProjectNo": "030631",
    "startDateISO": "2025-09-09",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/seneca-critical"
  },
  {
    "projectNo": "24324",
    "name": "Enloe Medical",
    "clientName": "Metal Works",
    "solTLName": "Shibu K",
    "clientSideProjectNo": "030741",
    "startDateISO": "2024-11-22",
    "endDateISO": "2025-08-04",
    "projectDataFolder": "/projects/data-warehouse/enloe-medical"
  },
  {
    "projectNo": "24346",
    "name": "TSMC Pedestrian",
    "clientName": "MMI",
    "solTLName": "Vrishabh",
    "clientSideProjectNo": "24999",
    "startDateISO": "2024-10-16",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/tsmc-pedestrian"
  },
  {
    "projectNo": "25321",
    "name": "MU P2 WWT Platforms",
    "clientName": "MMI",
    "solTLName": "Vrishabh",
    "clientSideProjectNo": "25-236",
    "startDateISO": "2025-08-22",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/mu-p2-wwt-platforms"
  },
  {
    "projectNo": "25338",
    "name": "P2 CDS",
    "clientName": "MMI",
    "solTLName": "Satpal",
    "clientSideProjectNo": "25217",
    "startDateISO": "2025-09-16",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/p2-cds"
  },
  {
    "projectNo": "24002",
    "name": "PCH Arrowhead",
    "clientName": "MMI",
    "solTLName": "Shahzeb",
    "clientSideProjectNo": null,
    "startDateISO": "2024-02-14",
    "endDateISO": "2024-02-29",
    "projectDataFolder": "/projects/data-warehouse/pch-arrowhead"
  },
  {
    "projectNo": "25161",
    "name": "F21P2 WWT Pipe Rack",
    "clientName": "MMI",
    "solTLName": "Maity",
    "clientSideProjectNo": "25-119",
    "startDateISO": "2025-07-11",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/f21p2-wwt-pipe-rack"
  },
  {
    "projectNo": "25330",
    "name": "UIS F21P2",
    "clientName": "MMI",
    "solTLName": "Maity",
    "clientSideProjectNo": "25-481",
    "startDateISO": "2025-08-27",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/uis-f21p2"
  },
  {
    "projectNo": "25372",
    "name": "P2 CDS 4",
    "clientName": "MMI",
    "solTLName": "Maity",
    "clientSideProjectNo": "25246",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/p2-cds-4"
  },
  {
    "projectNo": "25373",
    "name": "P2 CDS 11",
    "clientName": "MMI",
    "solTLName": "Maity",
    "clientSideProjectNo": "25247",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/p2-cds-11"
  },
  {
    "projectNo": "25346",
    "name": "Phase 2 Structure",
    "clientName": "MMI",
    "solTLName": "Alok",
    "clientSideProjectNo": "25240",
    "startDateISO": "2025-08-28",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/phase-2-structure"
  },
  {
    "projectNo": "25309",
    "name": "QTS PHX3-DC14",
    "clientName": "MMI",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": null,
    "startDateISO": "2025-09-17",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/qts-phx3-dc14"
  },
  {
    "projectNo": "25350",
    "name": "CR-INT-FAB",
    "clientName": "MMI",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "25237",
    "startDateISO": "2025-09-19",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/cr-int-fab"
  },
  {
    "projectNo": "25155",
    "name": "City North",
    "clientName": "MMI",
    "solTLName": "Shibu K",
    "clientSideProjectNo": "25120",
    "startDateISO": "2025-07-03",
    "endDateISO": "2025-09-22",
    "projectDataFolder": "/projects/data-warehouse/city-north"
  },
  {
    "projectNo": "24122",
    "name": "800 Commerce",
    "clientName": "Myrex",
    "solTLName": "Kuldeep",
    "clientSideProjectNo": "12160",
    "startDateISO": "2025-05-24",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/800-commerce"
  },
  {
    "projectNo": "25190",
    "name": "TMEIC Gemini",
    "clientName": "Myrex",
    "solTLName": "Kuldeep",
    "clientSideProjectNo": "12347",
    "startDateISO": "2025-06-20",
    "endDateISO": "2025-08-21",
    "projectDataFolder": "/projects/data-warehouse/tmeic-gemini"
  },
  {
    "projectNo": "25226",
    "name": "COM LCB",
    "clientName": "Myrex",
    "solTLName": "Kuldeep",
    "clientSideProjectNo": "12356",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/com-lcb"
  },
  {
    "projectNo": "25173",
    "name": "HHS",
    "clientName": "Myrex",
    "solTLName": "Azhar",
    "clientSideProjectNo": "12339",
    "startDateISO": "2025-07-01",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/hhs"
  },
  {
    "projectNo": "24422",
    "name": "Harris Health system",
    "clientName": "Myrex",
    "solTLName": "Manoj",
    "clientSideProjectNo": "12276",
    "startDateISO": "2025-09-03",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/harris-health-system"
  },
  {
    "projectNo": "24024",
    "name": "UT Austin Building",
    "clientName": "Myrex",
    "solTLName": "Rajkumar",
    "clientSideProjectNo": "12120",
    "startDateISO": "2025-07-08",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ut-austin-building"
  },
  {
    "projectNo": "24381",
    "name": "Conroe ISD Timber Mill HS #7",
    "clientName": "Myrex",
    "solTLName": "Rajkumar",
    "clientSideProjectNo": "12265",
    "startDateISO": "2025-03-28",
    "endDateISO": "2025-07-25",
    "projectDataFolder": "/projects/data-warehouse/conroe-isd-timber-mill-hs-7"
  },
  {
    "projectNo": "25217",
    "name": "GISD Ball",
    "clientName": "Myrex",
    "solTLName": "Rajkumar",
    "clientSideProjectNo": "12328",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/gisd-ball"
  },
  {
    "projectNo": "22301",
    "name": "HMH",
    "clientName": "Myrex",
    "solTLName": "Shubham",
    "clientSideProjectNo": "11943",
    "startDateISO": "2025-12-30",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/hmh"
  },
  {
    "projectNo": "25315",
    "name": "Spring HS",
    "clientName": "Myrex",
    "solTLName": "Rajkumar/shubham",
    "clientSideProjectNo": "12384",
    "startDateISO": "2025-09-08",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/spring-hs"
  },
  {
    "projectNo": "25148",
    "name": "Spring ISD Epic Center",
    "clientName": "Myrex",
    "solTLName": "Shynu",
    "clientSideProjectNo": "12330",
    "startDateISO": "2025-05-07",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/spring-isd-epic-center"
  },
  {
    "projectNo": "25303",
    "name": "Spitfire",
    "clientName": "Myrex",
    "solTLName": "Shynu",
    "clientSideProjectNo": "12376",
    "startDateISO": "2025-08-06",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/spitfire"
  },
  {
    "projectNo": "24251",
    "name": "MHSL Expansion",
    "clientName": "Myrex",
    "solTLName": "Sanoj",
    "clientSideProjectNo": "12215",
    "startDateISO": "2025-08-27",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/mhsl-expansion"
  },
  {
    "projectNo": "25358",
    "name": "CORR OSP",
    "clientName": "Myrex",
    "solTLName": "Sanoj",
    "clientSideProjectNo": "12397",
    "startDateISO": "2025-09-15",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/corr-osp"
  },
  {
    "projectNo": "23255",
    "name": "SIHI Mesa",
    "clientName": "S&H",
    "solTLName": "Nischal",
    "clientSideProjectNo": "23196",
    "startDateISO": "2025-01-16",
    "endDateISO": "2025-04-08",
    "projectDataFolder": "/projects/data-warehouse/sihi-mesa"
  },
  {
    "projectNo": "25092",
    "name": "ALA - Apache",
    "clientName": "S&H",
    "solTLName": "Nischal",
    "clientSideProjectNo": "25116",
    "startDateISO": "2025-04-09",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ala-apache"
  },
  {
    "projectNo": "25197",
    "name": "The Gilmore",
    "clientName": "S&H",
    "solTLName": "Nischal",
    "clientSideProjectNo": "25274",
    "startDateISO": "2025-06-05",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/the-gilmore"
  },
  {
    "projectNo": "25228",
    "name": "Biltmore",
    "clientName": "S&H",
    "solTLName": "Nischal",
    "clientSideProjectNo": "25249",
    "startDateISO": "2025-06-18",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/biltmore"
  },
  {
    "projectNo": "25059",
    "name": "WestMEC",
    "clientName": "S&H",
    "solTLName": "Koshal Kapil",
    "clientSideProjectNo": "24522",
    "startDateISO": "2025-08-26",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/westmec"
  },
  {
    "projectNo": "25112",
    "name": "Crosswalk Church",
    "clientName": "S&H",
    "solTLName": "Koshal Kapil",
    "clientSideProjectNo": "24520",
    "startDateISO": "2025-03-24",
    "endDateISO": "2025-04-16",
    "projectDataFolder": "/projects/data-warehouse/crosswalk-church"
  },
  {
    "projectNo": "24028",
    "name": "Kimsey AC",
    "clientName": "S&H",
    "solTLName": "Gaurav",
    "clientSideProjectNo": "24009",
    "startDateISO": "2025-04-22",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/kimsey-ac"
  },
  {
    "projectNo": "24238",
    "name": "VA Install Elevators",
    "clientName": "S&H",
    "solTLName": "Gaurav",
    "clientSideProjectNo": "24302",
    "startDateISO": "2025-06-24",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/va-install-elevators"
  },
  {
    "projectNo": "24405",
    "name": "Terraza Tri-City",
    "clientName": "S&H",
    "solTLName": "Gaurav",
    "clientSideProjectNo": "24335",
    "startDateISO": "2025-06-04",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/terraza-tri-city"
  },
  {
    "projectNo": "25376",
    "name": "ALA AJ Seminary",
    "clientName": "S&H",
    "solTLName": "Gaurav",
    "clientSideProjectNo": "24443",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ala-aj-seminary"
  },
  {
    "projectNo": "24237",
    "name": "ALA office",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "24276",
    "startDateISO": "2024-08-06",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ala-office"
  },
  {
    "projectNo": "24280",
    "name": "Fender Office",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "24287",
    "startDateISO": "2024-12-20",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/fender-office"
  },
  {
    "projectNo": "25039",
    "name": "ASAP Clinic",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "24535",
    "startDateISO": "2025-07-07",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/asap-clinic"
  },
  {
    "projectNo": "25237",
    "name": "Heroes Regional",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "25284",
    "startDateISO": "2025-08-22",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/heroes-regional"
  },
  {
    "projectNo": "25263",
    "name": "LHM Pro-Elite",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "25098",
    "startDateISO": "2025-09-19",
    "endDateISO": "2025-09-18",
    "projectDataFolder": "/projects/data-warehouse/lhm-pro-elite"
  },
  {
    "projectNo": "25327",
    "name": "BBMC Cup",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "25357",
    "startDateISO": "2025-08-18",
    "endDateISO": "2025-09-03",
    "projectDataFolder": "/projects/data-warehouse/bbmc-cup"
  },
  {
    "projectNo": "25337",
    "name": "Stream A7",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "24289",
    "startDateISO": "2025-09-10",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/stream-a7"
  },
  {
    "projectNo": "25354",
    "name": "ASM Garage",
    "clientName": "S&H",
    "solTLName": "Alok",
    "clientSideProjectNo": "25395",
    "startDateISO": "2025-09-16",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/asm-garage"
  },
  {
    "projectNo": "25046",
    "name": "Gilbert Advocacy",
    "clientName": "S&H",
    "solTLName": "Prashant",
    "clientSideProjectNo": "24462",
    "startDateISO": "2025-03-10",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/gilbert-advocacy"
  },
  {
    "projectNo": "25250",
    "name": "Innovation 27",
    "clientName": "S&H",
    "solTLName": "Prashant",
    "clientSideProjectNo": "25100",
    "startDateISO": "2025-07-04",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/innovation-27"
  },
  {
    "projectNo": "25359",
    "name": "Medina Station Phase 2",
    "clientName": "S&H",
    "solTLName": "Prashant",
    "clientSideProjectNo": "25372",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/medina-station-phase-2"
  },
  {
    "projectNo": "24412",
    "name": "Terraza Village",
    "clientName": "S&H",
    "solTLName": "Shyju",
    "clientSideProjectNo": "24528",
    "startDateISO": "2024-12-04",
    "endDateISO": "2025-04-11",
    "projectDataFolder": "/projects/data-warehouse/terraza-village"
  },
  {
    "projectNo": "24424",
    "name": "Vulture Mountain",
    "clientName": "S&H",
    "solTLName": "Shyju",
    "clientSideProjectNo": "24341",
    "startDateISO": "2025-08-14",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/vulture-mountain"
  },
  {
    "projectNo": "25194",
    "name": "Madison Park",
    "clientName": "S&H",
    "solTLName": "Shyju",
    "clientSideProjectNo": "25194",
    "startDateISO": "2025-07-10",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/madison-park"
  },
  {
    "projectNo": "25351",
    "name": "Casa Dialysis",
    "clientName": "S&H",
    "solTLName": "Shyju",
    "clientSideProjectNo": "25231",
    "startDateISO": "2025-08-28",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/casa-dialysis"
  },
  {
    "projectNo": "24361",
    "name": "Pickball Courts",
    "clientName": "S&H",
    "solTLName": "Sajith",
    "clientSideProjectNo": "25266",
    "startDateISO": "2025-06-26",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/pickball-courts"
  },
  {
    "projectNo": "25062",
    "name": "ADOT Tucson",
    "clientName": "S&H",
    "solTLName": "Sajith",
    "clientSideProjectNo": "24463",
    "startDateISO": "2025-02-18",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/adot-tucson"
  },
  {
    "projectNo": "25078",
    "name": "Sands 34",
    "clientName": "S&H",
    "solTLName": "Sajith",
    "clientSideProjectNo": "24541",
    "startDateISO": "2025-09-03",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/sands-34"
  },
  {
    "projectNo": "25176",
    "name": "Miami Inspiration",
    "clientName": "S&H",
    "solTLName": "Sajith",
    "clientSideProjectNo": "24563",
    "startDateISO": "2025-05-16",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/miami-inspiration"
  },
  {
    "projectNo": "25260",
    "name": "Louise 32",
    "clientName": "S&H",
    "solTLName": "Sajith",
    "clientSideProjectNo": "25340",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/louise-32"
  },
  {
    "projectNo": "24257",
    "name": "MOA",
    "clientName": "Sampson",
    "solTLName": "Vrishabh",
    "clientSideProjectNo": "405",
    "startDateISO": "2024-07-29",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/moa"
  },
  {
    "projectNo": "25109",
    "name": "Interior Wall Mount",
    "clientName": "Sampson",
    "solTLName": "Vrishabh",
    "clientSideProjectNo": "412",
    "startDateISO": "2025-03-19",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/interior-wall-mount"
  },
  {
    "projectNo": "24353",
    "name": "Alaska Aviator",
    "clientName": "Sampson",
    "solTLName": "Sumit",
    "clientSideProjectNo": "470ID",
    "startDateISO": "2024-11-13",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/alaska-aviator"
  },
  {
    "projectNo": "24439",
    "name": "Chugiak HS",
    "clientName": "Sampson",
    "solTLName": "Somnath",
    "clientSideProjectNo": "191",
    "startDateISO": "2024-12-31",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/chugiak-hs"
  },
  {
    "projectNo": "25057",
    "name": "AWWU Pump",
    "clientName": "Sampson",
    "solTLName": "Somnath",
    "clientSideProjectNo": "295",
    "startDateISO": "2025-02-20",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/awwu-pump"
  },
  {
    "projectNo": "25302",
    "name": "Lake Keen",
    "clientName": "Sampson",
    "solTLName": "Somnath",
    "clientSideProjectNo": "445",
    "startDateISO": "2025-07-31",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/lake-keen"
  },
  {
    "projectNo": "25202",
    "name": "ASD Ravenwood",
    "clientName": "Sampson",
    "solTLName": "Kumar Abhishek",
    "clientSideProjectNo": "299",
    "startDateISO": "2025-07-01",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/asd-ravenwood"
  },
  {
    "projectNo": "25347",
    "name": "MSBSD Academy",
    "clientName": "Sampson",
    "solTLName": "Shyju",
    "clientSideProjectNo": "461",
    "startDateISO": null,
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/msbsd-academy"
  },
  {
    "projectNo": "25370",
    "name": "Ouzinkie",
    "clientName": "Sampson",
    "solTLName": "Shyju",
    "clientSideProjectNo": "975",
    "startDateISO": "2025-09-19",
    "endDateISO": null,
    "projectDataFolder": "/projects/data-warehouse/ouzinkie"
  }
];

async function ensureClient(c) {
  return prisma.client.upsert({
    where: { email: c.email },
    update: { name: c.name },
    create: { name: c.name, email: c.email, configuration: {}, ccListData: [], folderStructure: {} }
  });
}

async function ensureUser(u, clientId = null) {
  const hashed = await bcrypt.hash(u.password, 10);
  return prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, userType: u.userType, clientId },
    create: { name: u.name, email: u.email, password: hashed, userType: u.userType, clientId }
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
      startDate: p.startDateISO ? new Date(p.startDateISO) : null,
      endDate: p.endDateISO ? new Date(p.endDateISO) : null,
      jobName: p.clientSideProjectNo || null,
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
  console.log('✅ Seed complete', { clients: CLIENTS.length, tlUsers: TL_USERS.length, clientUsers: CLIENT_USERS.length, projects: PROJECTS.length });
}

main().catch(e => { console.error('❌ Seeding error:', e); process.exit(1); })
      .finally(async () => { await prisma.$disconnect(); });
