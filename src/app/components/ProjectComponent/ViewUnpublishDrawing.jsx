'use client';
import { useState } from "react";
import SearchFilter from "../SearchFilter";
import TableComponent from "../Table";

const ViewUnpublishDrawing = () => {
   const view_unpublished_drawing_data = [
      {id: 1, projecttype:'Hybrid', projectname: 'Jay Brant House', projectno: '2017183', clientname: 'XYZ Constructions'},
      {id: 2, projecttype:'Hybrid', projectname: 'Cade Task List', projectno: '2017184', clientname: 'ABC Constructions'},
      {id: 3, projecttype:'Hybrid', projectname: 'Tekla Task List', projectno: '2017185', clientname: 'XYZ Builders'},  
      {id: 4, projecttype:'Hybrid', projectname: 'Task History', projectno: '2017186', clientname: 'LMN Developers'},
    ];
    
    const [filteredData, setFilteredData] = useState(view_unpublished_drawing_data);

  return (
     <div className="p-6">
        <SearchFilter
        data={view_unpublished_drawing_data}
        searchFields={[
            'projecttype',
            'projectname',
            'projectno',
            'clientname'
        ]}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['Project Type', 'Project Name', 'Project No', 'Client Name']}
        keys={['projecttype', 'projectname', 'projectno', 'clientname']}
        data={filteredData}
        showActions={true}
        actionHeaderText="View"
        onView={(row) => console.log('View:', row)}
      />
    </div>
  )
}

export default ViewUnpublishDrawing