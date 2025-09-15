const TabsHeader = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex border-b">
      <button
        onClick={() => setActiveTab("basic")}
        className={`rounded px-4 py-2 ${activeTab === "basic" ? "bg-white border-t border-l border-r font-bold" : "bg-gray-200"}`}
      >
        Basic
      </button>
      <button
        onClick={() => setActiveTab("permissions")}
        className={`rounded px-4 py-2 ${activeTab === "permissions" ? "bg-white border-t border-l border-r font-bold" : "bg-gray-200"}`}
      >
        Permissions
      </button>
    </div>
  );
};

export default TabsHeader;
