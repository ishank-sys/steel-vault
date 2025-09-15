'use client';
import React, { useState } from 'react'
import TableComponent from '../../Table'
import SearchFilter from '../../SearchFilter'

const ViewRFI = () => {

const view_rfi_data = [
        {id: 1, projectname:'Laveen Elementary School', projectno: '2025180'},
       
    ];

    const [filteredData, setFilteredData] = useState(view_rfi_data);

    

  return (
     <div className="p-6">
        <SearchFilter
        data={view_rfi_data}
        searchFields={[
            'projectname',
            'projectno'
        ]}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['Project Name', 'Project No']}
        keys={['projectname', 'projectno']}
        data={filteredData}
        showActions={true}
        actionHeaderText="view"
        onView={(row) => console.log('View:', row)}        
      />
    </div>
  )
}

export default ViewRFI