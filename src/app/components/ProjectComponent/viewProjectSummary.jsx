import { useState, useEffect } from "react";
import SearchFilter from "../SearchFilter";
import TableComponent from "../Table";

const ViewProjectSummaryPage = () => {
  const [projectData, setProjectData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) throw new Error("Failed to fetch projects");
        const data = await res.json();
        // Map/format data as needed for your table
        const formatted = data.map((p) => ({
          id: p.id,
          projectname: p.name || "-",
          projectno: p.projectNo || "-",
          clientname: p.client?.name || "-",
          prjestdate: p.estimatedDate ? new Date(p.estimatedDate).toLocaleDateString() : "-",
          prjstartdate: p.startDate ? new Date(p.startDate).toLocaleDateString() : "-",
          prjenddate: p.endDate ? new Date(p.endDate).toLocaleDateString() : "-",
          totaltlhrs: p.totalTlHours?.toFixed(2) ?? "-",
          totalsheets: p.totalSheets?.toFixed(1) ?? "-",
          totaldays: p.totalDays?.toString() ?? "-",
        }));
        setProjectData(formatted);
        setFilteredData(formatted);
      } catch (e) {
        setProjectData([]);
        setFilteredData([]);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="p-6">
      <SearchFilter
        data={projectData}
        searchFields={[
          'projectname',
          'projectno',
          'clientname',
          'prjestdate',
          'prjstartdate',
          'prjenddate',
          'totaltlhrs',
          'totalsheets',
          'totaldays'
        ]}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={[
          'Project Name',
          'Project No',
          'Client Name',
          'Project Est. Date',
          'Project Start Date',
          'Project End Date',
          'Total TL Hours',
          'Total Sheets',
          'Total Days'
        ]}
        keys={[
          'projectname',
          'projectno',
          'clientname',
          'prjestdate',
          'prjstartdate',
          'prjenddate',
          'totaltlhrs',
          'totalsheets',
          'totaldays'
        ]}
        data={filteredData}
        showActions={true}
        actionHeaderText="PM Quotes"
        showManpowerPlanning2={true}
        onEdit={(row) => console.log('Edit:', row)}
      />
    </div>
  );
};

export default ViewProjectSummaryPage;