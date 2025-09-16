"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useSession } from 'next-auth/react';

const SidebarItem = ({ label, href }) => (
  <Link
    href={href}
    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
  >
    <span>{label}</span>
  </Link>
);

const CollapsibleGroup = ({ label, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 font-medium text-blue-50 bg-[#176993]  hover:bg-blue-300 rounded-lg transition-colors duration-200"
      >
        <span>{label}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        )}
      </button>
      <div
        className={`ml-4 mt-2 space-y-1 overflow-hidden transition-all duration-300 ${
          open ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default function Sidebar() {
  const { data: session } = useSession();
  const [userType, setUserType] = useState(null);

  // If session has a userType, normalize and use it. React to session changes.
  useEffect(() => {
    const raw = session?.user?.userType;
    if (raw) {
      setUserType(String(raw).toLowerCase().trim());
    }
  }, [session]);

  // If we still don't have a userType, try fetching current user info
  useEffect(() => {
    if (userType) return;
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.userType) setUserType(String(data.userType).toLowerCase().trim());
      } catch (e) {
        // ignore
      }
    };
    fetchMe();
  }, [userType]);

  const canShow = (section) => {
    const t = (userType || '').toLowerCase();
    // admin sees everything
    if (t.includes('admin')) return true;
    if (t.includes('client')) {
      // Clients can only see Clients section (not Project)
      return section === 'Clients';
    }
    if (t.includes('employee')) {
      return ['Employee', 'Project'].includes(section);
    }
    // default: show only Employee links
    return section === 'Employee';
  };

  return (
    <aside className="w-64 h-full p-2 bg-white-200  shadow-blue-400/50 overflow-y-auto">
      {/* Employee Section (formerly Home) */}
      {canShow('Employee') && (
        <CollapsibleGroup label="Employee">
          <SidebarItem label="Dashboard" href="/dashboard/home/dashboard" />
          <SidebarItem
            label="Change Password"
            href="/dashboard/home/change_password"
          />
          <SidebarItem
            label="Upload & Download Documents"
            href="/dashboard/home/upload_documents"
          />
          <SidebarItem
            label="View Project Files"
            href="/dashboard/project/view-project-files"
          />
        </CollapsibleGroup>
      )}

      {/* Admin Section */}
      {canShow('Admin') && (
        <CollapsibleGroup label="Admin">
          <CollapsibleGroup label="User">
            <SidebarItem label="New User" href="/dashboard/admin/user/new_user" />
            <SidebarItem label="View User" href="/dashboard/admin/user/view_user" />
            <SidebarItem
              label="View Ex-User"
              href="/dashboard/admin/user/view_ex_user"
            />
            <SidebarItem
              label="View Client Users"
              href="/dashboard/admin/user/view_client_user"
            />
          </CollapsibleGroup>

          <CollapsibleGroup label="Roles">
            <SidebarItem label="New Role" href="/dashboard/admin/roles/new_role" />
            <SidebarItem
              label="View Role"
              href="/dashboard/admin/roles/view_role"
            />
          </CollapsibleGroup>

          <CollapsibleGroup label="Prospect">
            <SidebarItem
              label="Create Client"
              href="/dashboard/clients/create_client"
            />
            <SidebarItem
              label="View Client"
              href="/dashboard/clients/view_client"
            />
          </CollapsibleGroup>
        </CollapsibleGroup>
      )}

      {/* Clients Section */}
      {canShow('Clients') && (
        <CollapsibleGroup label="Clients">
          <SidebarItem
            label="Dashboard"
            href="/dashboard/home/dashboard"
          />
          <SidebarItem
            label="Change Password"
            href="/clients/change-password"
          />
          <SidebarItem
            label="Design Drawing"
            href="/clients/design-drawing"
          />
          <SidebarItem
            label="View Files"
            href="/clients/view-files"
          />
        </CollapsibleGroup>
      )}

      {/* Project Section */}
      {canShow('Project') && (
        <CollapsibleGroup label="Project">
          <CollapsibleGroup label="Project">
            <SidebarItem
              label="Project Estimation"
              href="/dashboard/project/project/project_estimation"
            />
            <SidebarItem
              label="View Project Estimation"
              href="/dashboard/project/project/view_project_estimation"
            />
            <SidebarItem
              label="View Project Summary"
              href="/dashboard/project/project/view_project_summary"
            />
            <SidebarItem
              label="View Drawing Details"
              href="/dashboard/project/project/view_drawing_details"
            />
            <SidebarItem
              label="View Published Drawings"
              href="/dashboard/project/project/view_published_drawings"
            />
            <SidebarItem
              label="Publish Drawings"
              href="/dashboard/project/project/publish_drawings"
            />
            <SidebarItem
              label="View Unpublish Drawings"
              href="/dashboard/project/project/view_unpublish_drawings"
            />
            <SidebarItem
              label="Send Drawings Submittal"
              href="/dashboard/project/project/send_drawings_submittal"
            />
            <SidebarItem
              label="View Project Files"
              href="/dashboard/project/view-project-files"
            />
          </CollapsibleGroup>

          <CollapsibleGroup label="Item">
            <SidebarItem
              label="Add Item Code"
              href="/dashboard/project/item/add_item_code"
            />
            <SidebarItem
              label="View Code List"
              href="/dashboard/project/item/view_code_list"
            />
          </CollapsibleGroup>
        </CollapsibleGroup>
      )}
    </aside>
  );
}
