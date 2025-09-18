'use client';
import { useState, useEffect } from "react";
import SearchFilter from "../SearchFilter";
import TableComponent from "../Table";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
function formatTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const viewPublishedDrawing = () => {
  const [logs, setLogs] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [projectMap, setProjectMap] = useState({});
  const [clientMap, setClientMap] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [logsRes, projectsRes, clientsRes] = await Promise.all([
          fetch("/api/document-logs"),
          fetch("/api/projects"),
          fetch("/api/clients"),
        ]);
        const logsData = logsRes.ok ? await logsRes.json() : [];
        const projectsData = projectsRes.ok ? await projectsRes.json() : [];
        const clientsData = clientsRes.ok ? await clientsRes.json() : [];

        // Map projectId -> projectName
  const pMap = {};
  (projectsData || []).forEach(p => { pMap[p.id] = p.name || p.projectName || p.id; });
        setProjectMap(pMap);
        // Map clientId -> clientName
  const cMap = {};
  (clientsData || []).forEach(c => { cMap[c.id] = c.name || c.clientName || c.id; });
        setClientMap(cMap);

        // Add serial number, project name, client name, formatted date/time
        const logsWithNames = (logsData || []).map((log, idx) => ({
          slno: idx + 1,
          clientName: cMap[log.clientId] || log.clientId,
          projectName: pMap[log.projectId] || log.projectId,
          uploadDate: formatDate(log.uploadedAt),
          uploadTime: formatTime(log.uploadedAt),
          ...log,
        }));
        setLogs(logsWithNames);
        setFilteredData(logsWithNames);
      } catch (e) {
        setLogs([]);
        setFilteredData([]);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="p-6">
      <SearchFilter
        data={logs}
        searchFields={['clientName', 'projectName', 'fileName', 'uploadDate', 'uploadTime']}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['S.No.', 'Client Name', 'Project Name', 'File Name', 'Upload Date', 'Upload Time']}
        keys={['slno', 'clientName', 'projectName', 'fileName', 'uploadDate', 'uploadTime']}
        data={filteredData}
        //showActions={true}
        //actionHeaderText="View"
        //onView={(row) => console.log('View:', row)}
      />
    </div>
  );
};

export default viewPublishedDrawing;