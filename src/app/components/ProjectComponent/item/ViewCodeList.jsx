'use client';
import React, { useState } from 'react'
import TableComponent from '../../Table'
import SearchFilter from '../../SearchFilter'

const ViewCodeList = () => {

    const view_code_list_data = [
        {id: 1, itemcode:'DEK', itemname: 'Deck', detail: 'SHOP DRAWING'},
        {id: 2, itemcode:'BEAM', itemname: 'Beam', detail: 'SHOP DRAWING'},
        {id: 3, itemcode:'COLUMN', itemname: 'Column', detail: 'SHOP DRAWING'},
        {id: 4, itemcode:'PLATE', itemname: 'Plate', detail: 'SHOP DRAWING'},
        {id: 5, itemcode:'WELD', itemname: 'Weld', detail: 'SHOP DRAWING'},
        {id: 6, itemcode:'BOLT', itemname: 'Bolt', detail: 'SHOP DRAWING'},
    ];

    const [filteredData, setFilteredData] = useState(view_code_list_data);
    
  return (
      <div className="p-6">
        <SearchFilter
        data={view_code_list_data}
        searchFields={[
            'itemcode',
            'itemname',
            'detail'
        ]}
        onFilteredDataChange={setFilteredData}
      />
      <TableComponent
        headers={['Item Code', 'Item Name', 'Detail']}
        keys={['itemcode', 'itemname', 'detail']}
        data={filteredData}
        showActions={true}
        actionHeaderText="Edit/Delete"
        onEdit={(row) => console.log('Edit:', row)}
        onDelete={(row) => console.log('Delete:', row)}        
      />
    </div>
  )
}

export default ViewCodeList