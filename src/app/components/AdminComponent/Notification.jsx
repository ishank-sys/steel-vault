import React, { useState } from "react";
import TableComponent from '../Table'
import SearchFilter from '../SearchFilter'

const Notification = () => {

 const notification_data = [
       { id: 1, name: 'Johnny' },
       { id: 2, name: 'Samual'},
       
     ]
      const [filteredData, setFilteredData] = useState(notification_data);

  return (
     <div className="p-6">
       <SearchFilter
        data={notification_data}
        searchFields={[
          "name"
        ]}
        onFilteredDataChange={setFilteredData}
      />
     <TableComponent
          headers={['Name']}
          keys={['name']}
          data={filteredData}
          showActions={true}
          actionHeaderText={['Add Role/Users']}
          onEdit={(row) => console.log('Edit:', row)}
        //   onDelete={(row) => console.log('Delete:', row)}
        />
    </div>
  )
}

export default Notification