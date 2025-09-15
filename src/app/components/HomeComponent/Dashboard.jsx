"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TableComponent from "../Table";
import SearchFilter from "../SearchFilter";
import Link from "next/link";

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const router = useRouter();

  const headers = [
  "Client",
  "Fabricator Job No",
    "SOL Job No",
    "Job Name",
    "Project Type",
    "Project Sub-Type",
    "Fabricator PM Name",
    "Weight (t)",
    "Latest Submission",
  ];

  const keys = [
    // 'client' and 'solTL' are objects; Table will render their .name
    'client',
    "fabricatorJobNo",
    "solJobNo",
    "jobName",
    "projectType",
    "projectSubType",
    'solTL',
    "fabricatorPMName",
    "weightTonnage",
    "latestSubmission",
  ];

  useEffect(() => {
    // Fetch current user and projects; if not admin, only show projects where solTL matches logged-in user
    async function load() {
      try {
        const [meRes, projRes] = await Promise.all([fetch('/api/users/me'), fetch('/api/projects')]);
        if (!meRes.ok || !projRes.ok) {
          console.error('Failed to fetch user or projects');
          return;
        }
        const me = await meRes.json();
        const projects = await projRes.json();

        let visible = projects;
        if (me && me.userType && me.userType.toLowerCase() !== 'admin') {
          // filter by solTL match (prefer id, fallback to name)
          visible = projects.filter((p) => {
            if (!p.solTL) return false;
            if (me.id && p.solTL.id && Number(p.solTL.id) === Number(me.id)) return true;
            if (me.name && p.solTL.name && p.solTL.name === me.name) return true;
            return false;
          });
        }

        setData(visible);
        setFilteredData(visible);
      } catch (error) {
        console.error('❌ Error fetching user/projects:', error);
      }
    }

    load();
  }, []);

  return (
    <div className="p-6">
      <SearchFilter
        data={data}
        searchFields={[
          "client",
          "fabricatorJobNo",
          "solJobNo",
          "jobName",
          "projectType",
          "projectSubType",
          "fabricatorPMName",
          "weightTonnage",
          "latestSubmission",
        ]}
        onFilteredDataChange={setFilteredData}
      />
      <div className="p-4 bg-white mt-6">
        <TableComponent
          headers={headers}
          keys={keys}
          data={filteredData}
          cellClickHandlers={{
            latestSubmission: (row) =>
              router.push(`/dashboard/home/dashboard/latestsubmission/${row.latestSubmission}`),
          }}
          customColumns={[
            {
              header: "Project Data Folder",
              render: (row) => (
                <Link
                  href={`/dashboard/home/dashboard/projectdatafolder/${row.projectDataFolder}`}
                  className="hover:text-blue-600"
                >
                  Open
                </Link>
              ),
            },
            {
              header: 'Project File',
              render: (row) => (
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      // fetch document logs for this project
                      const logsRes = await fetch(`/api/document-logs`);
                      if (!logsRes.ok) throw new Error('Failed to fetch logs');
                      const logs = await logsRes.json();
                      const first = logs.find(l => l.projectId === row.id);
                      if (!first) {
                        alert('No files available for this project');
                        return;
                      }

                      // request signed url for this object's storagePath
                      const signedRes = await fetch('/api/gcs/signed-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: first.storagePath, expiresSeconds: 300 }),
                      });
                      const signed = await signedRes.json();
                      if (signed && signed.url) {
                        window.open(signed.url, '_blank');
                      } else {
                        alert('Failed to get download URL');
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Download failed');
                    }
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Download
                </button>
              ),
            },
            {
              header: "Project Status Report",
              render: (row) => (
                <Link
                  href={`/dashboard/home/dashboard/projectstatusreport/${row.projectStatusReport}`}
                  className="hover:text-blue-600"
                >
                  Open
                </Link>
              ),
            },
            {
              header: "Project IFC Progress Chart",
              render: (row) => (
                <Link
                  href={`/dashboard/home/dashboard/projectifc/${row.projectIFCProgressChart}`}
                  className="hover:text-blue-600"
                >
                  Open
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
