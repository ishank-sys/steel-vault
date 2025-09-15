'use client';
import React, { useState } from 'react'
import TableComponent from '../../Table'
import SearchFilter from '../../SearchFilter'

const ExtraHoursList = () => {

 const extra_hour_list_data = [
        {id: 1, Projectno:'2020113', projectname: 'GRHC Behavioral Health', clientname: 'Nathan Larkin'},
        {id: 2, Projectno:'2020114', projectname: 'GRHC Behavioral Health', clientname: 'Nathan Larkin'},
        {id: 3, Projectno:'2020115', projectname: 'GRHC Behavioral Health', clientname: 'Nathan Larkin'},
        {id: 4, Projectno:'2020116', projectname: 'GRHC Behavioral Health', clientname: 'Nathan Larkin'},
        {id: 5, Projectno:'2020117', projectname: 'GRHC Behavioral Health', clientname: 'Nathan Larkin'},
    ];

    const [filteredData, setFilteredData] = useState(extra_hour_list_data);
    

  return (
    <div className="p-6">
        <SearchFilter
        data={extra_hour_list_data}
        searchFields={[
            'Projectno',
            'projectname',
            'clientname'
        ]}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['Project No', 'Project Name', 'Client Name']}
        keys={['Projectno', 'projectname', 'clientname']}
        data={filteredData}
        showActions={true}
        actionHeaderText="Extra Hours"  
        onView={(row) => console.log('View:', row)}     
      />
    </div>
  )
}

export default ExtraHoursList