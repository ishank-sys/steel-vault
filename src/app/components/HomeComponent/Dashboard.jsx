"use client";


import { useState, useEffect } from "react";
import TableComponent from '../Table';
import SearchFilter from '../SearchFilter';
import Link from 'next/link';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [lastSubmissionMap, setLastSubmissionMap] = useState({});
  const [user, setUser] = useState(null);

  // Fetch user, projects, and document logs
  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user info
        const userRes = await fetch('/api/users/me');
        const userData = await userRes.json();
        setUser(userData);

        // Get all projects and document logs
        const [projRes, docLogRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/document-logs'),
        ]);
        let projects = await projRes.json();
        const docLogs = await docLogRes.json();

        // Filter projects based on user type
        if (userData && userData.userType) {
          const type = String(userData.userType).toLowerCase();
          if (type.includes('employee')) {
            // Only show projects where solTL.id === user.id
            projects = (projects || []).filter(p => p.solTL?.id === userData.id);
          } else if (type.includes('client')) {
            // Client users should see projects where Project.clientPm === logged-in user's id
            const uid = Number(userData.id);
            projects = (projects || []).filter(p => {
              // support numeric or string stored clientPm
              const pm = p?.clientPm ?? p?.clientPM ?? p?.clientpm ?? p?.client_pm;
              return pm != null && Number(pm) === uid;
            });
          }
          // admin sees all
        }

        // Map projectId -> latest uploadedAt date
        const map = {};
        (Array.isArray(docLogs) ? docLogs : []).forEach(log => {
          if (log.projectId) {
            const prev = map[log.projectId];
            const currDate = log.uploadedAt ? new Date(log.uploadedAt) : null;
            if (currDate && (!prev || currDate > prev)) {
              map[log.projectId] = currDate;
            }
          }
        });
        setLastSubmissionMap(map);
        setProjects(Array.isArray(projects) ? projects : []);
        setFilteredData(Array.isArray(projects) ? projects : []);
      } catch (err) {
        setProjects([]);
        setFilteredData([]);
        setLastSubmissionMap({});
      }
    }
    fetchData();
  }, []);


  const headers = [
    "Project No",
    "Project Name",
    "Client",
    "Weightage (t)",
    "SOL TL",
    "Last Submission"
  ];

  const keys = [
    "projectNo",
    "name",
    "clientName",
    "weightTonnage",
    "solTLName",
    "lastSubmission"
  ];

  // Map projects to add clientName, solTLName, and lastSubmission for table
  const tableData = filteredData.map((p) => ({
    ...p,
    clientName: p.client?.name || p.clientName || "-",
    solTLName: p.solTL?.name || p.solTLName || "-",
    lastSubmission: lastSubmissionMap[p.id]
      ? new Date(lastSubmissionMap[p.id]).toLocaleDateString()
      : "-"
  }));

  return (
    <div className="p-6">
      <SearchFilter
        data={projects}
        searchFields={["projectNo", "name", "clientName", "weightTonnage"]}
        onFilteredDataChange={setFilteredData}
      />
      <div className="p-4 bg-white mt-6">
        <TableComponent
          headers={[...headers, "Document Log"]}
          keys={keys}
          data={tableData}
          customColumns={[
            {
              header: '',
              render: (row) => (
                <Link
                  href={`/dashboard/documentlog/${row.id}`}
                  className="text-blue-600 underline"
                >
                  View Log
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}