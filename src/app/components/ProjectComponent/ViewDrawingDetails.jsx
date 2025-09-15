import { useState } from "react";
import SearchFilter from "../SearchFilter";
import TableComponent from "../Table";

const ViewDrawingDetailsPage = () => {
    
     const view_drawing_details_data = [
    { id: 1, projectname: 'Catepillar', projectno: '2017183', drawingno: 'ABP1', status: 'For Field Use', detailer: 'Sam', checker: 'Kan', detailingtime: '7.0', checkingtime: '3.3', tltime: '1.1', totaltime: '1.1'},
    { id: 2, projectname: 'Cade Task List', projectno: '2017184', drawingno: 'ABP2', status: 'For Field Use', detailer: 'John', checker: 'Doe', detailingtime: '5.0', checkingtime: '2.5', tltime: '1.0', totaltime: '1.0'},
    { id: 3, projectname: 'Tekla Task List', projectno: '2017185', drawingno: 'ABP3', status: 'For Field Use', detailer: 'Alice', checker: 'Smith', detailingtime: '6.0', checkingtime: '3.0', tltime: '1.2', totaltime: '1.2'},
    { id: 4, projectname: 'Task History', projectno: '2017186', drawingno: 'ABP4', status: 'For Field Use', detailer: 'Bob', checker: 'Johnson', detailingtime: '8.0', checkingtime: '4.0', tltime: '1.5', totaltime: '1.5'},           
    { id: 5, projectname: 'Dashboard', projectno: '2017187', drawingno: 'ABP5', status: 'For Field Use', detailer: 'Carol', checker: 'White', detailingtime: '4.0', checkingtime: '2.0', tltime: '1.3', totaltime: '1.3'},
    { id: 6, projectname: 'Change Password', projectno: '2017188', drawingno: 'ABP6', status: 'For Field Use', detailer: 'David', checker: 'Brown', detailingtime: '3.0', checkingtime: '1.5', tltime: '1.1', totaltime: '1.1'},
    { id: 7, projectname: 'Report', projectno: '2017189', drawingno: 'ABP7', status: 'For Field Use', detailer: 'Eve', checker: 'Black', detailingtime: '2.0', checkingtime: '1.0', tltime: '1.2', totaltime: '1.2'},
    { id: 8, projectname: 'Upload ', projectno: '2017190', drawingno: 'ABP8', status: 'For Field Use', detailer: 'Frank', checker: 'Green', detailingtime: '9.0', checkingtime: '4.5', tltime: '1.4', totaltime: '1.4'},
  ];

  const [filteredData, setFilteredData] = useState(view_drawing_details_data);



  return (
    <div className="p-6">
        <SearchFilter
        data={view_drawing_details_data}
        searchFields={[
            'projectname',
            'projectno',
            'drawingno',
            'status',
            'detailer',
            'checker'
        ]}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['Project Name', 'Project No', 'Drawing No', 'Status', 'Detailer', 'Checker', 'Detailing Time', 'Checking Time', 'TL Time', 'Total Time']}
        keys={['projectname', 'projectno', 'drawingno', 'status', 'detailer', 'checker', 'detailingtime', 'checkingtime', 'tltime', 'totaltime']}
        data={filteredData}
        showActions={true}
        actionHeaderText="Edit"
        showLink1={true}
        Link1="Revision"
        showManpowerPlanning2={true}
        onEdit={(row) => console.log('Edit:', row)}
      />
    </div>
  )
}

export default ViewDrawingDetailsPage