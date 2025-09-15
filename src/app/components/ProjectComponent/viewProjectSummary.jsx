import { useState } from "react";
import SearchFilter from "../SearchFilter";
import TableComponent from "../Table";

const ViewProjectSummaryPage = () => {

    const view_project_summary_data = [
      {id: 1, projectname: 'Jay Brant House', projectno: '2017183', clientname: 'JT Steel', prjestdate: '06-04-2025', prjstartdate: '05-04-2025', prjenddate: '06-09-2025', totaltlhrs: '10.00', totalsheets: '1.0', totaldays: '6'},
      {id: 2, projectname: 'Cade Task List', projectno: '2017184', clientname: 'ABC Constructions', prjestdate: '07-04-2025', prjstartdate: '06-04-2025', prjenddate: '07-09-2025', totaltlhrs: '12.00', totalsheets: '2.0', totaldays: '7'},
      {id: 3, projectname: 'Tekla Task List', projectno: '2017185', clientname: 'XYZ Builders', prjestdate: '08-04-2025', prjstartdate: '07-04-2025', prjenddate: '08-09-2025', totaltlhrs: '15.00', totalsheets: '3.0', totaldays: '8'},
      {id: 4, projectname: 'Task History', projectno: '2017186', clientname: 'LMN Developers', prjestdate: '09-04-2025', prjstartdate: '08-04-2025', prjenddate: '09-09-2025', totaltlhrs: '20.00', totalsheets: '4.0', totaldays: '9'},
      {id: 5, projectname: 'Dashboard', projectno: '2017187', clientname: 'PQR Constructions', prjestdate: '10-04-2025', prjstartdate: '09-04-2025', prjenddate: '10-09-2025', totaltlhrs: '25.00', totalsheets: '5.0', totaldays: '10'},
      {id: 6, projectname: 'Change Password', projectno: '2017188', clientname: 'STU Builders', prjestdate: '11-04-2025', prjstartdate: '10-04-2025', prjenddate: '11-09-2025', totaltlhrs: '30.00', totalsheets: '6.0', totaldays: '11'},
    ];
  
    const [filteredData, setFilteredData] = useState(view_project_summary_data);

  return (
     <div className="p-6">
        <SearchFilter
        data={view_project_summary_data}
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
        headers={['Project Name', 'Project No', 'Client Name', 'Project Est. Date', 'Project Start Date', 'Project End Date', 'Total TL Hours', 'Total Sheets', 'Total Days']}
        keys={['projectname', 'projectno', 'clientname', 'prjestdate', 'prjstartdate', 'prjenddate', 'totaltlhrs', 'totalsheets', 'totaldays']}
        data={filteredData}
        showActions={true}
        actionHeaderText="PM Quotes"
        showManpowerPlanning2={true}
        onEdit={(row) => console.log('Edit:', row)}
      />
    </div>
  )
}

export default ViewProjectSummaryPage