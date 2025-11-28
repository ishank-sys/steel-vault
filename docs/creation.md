# CREATION.md

## 1. Overview of the Work Done

This frontend refactor recreates the admin creation UI components in plain JavaScript (React) and preserves the original UI/UX while removing all backend logic. Key points:

- Dialog components recreated in JavaScript with the same UI and interactive behavior as the original TypeScript + Supabase versions:
  - AddProjectDialog
  - AddClientDialog
  - AddTeamLeadDialog
  - AddClientPMDialog
- All actual backend calls, Supabase imports, react-query usage, and toast notifications have been removed and replaced with explicit placeholders:
  ```js
  // TODO: backend logic placeholder
  ```
- Client configuration (folder / file structure) was recreated and keeps full functionality. Zustand is used to persist folderStructure in-memory and to sync UI state.
- Dialogs support controlled and uncontrolled open state and accept `initialData` + `isEdit` props for editing.

---

## 2. File Paths & Components

Recommended file layout (used in this refactor):

```
src/app/dashboard/admin/creation/AddProjectDialog.jsx
src/app/dashboard/admin/creation/AddClientDialog.jsx
src/app/dashboard/admin/creation/AddTeamLeadDialog.jsx
src/app/dashboard/admin/creation/AddClientPMDialog.jsx
src/app/dashboard/admin/creation/ClientConfig.jsx    (or FolderStructure.jsx)
src/stores/clientStore.jsx                           (Zustand store for folder structure)
src/app/dashboard/admin/creation/page.tsx            (Admin Console page wiring)
CREATION.md
```

Notes:
- Files were created under `src/app/dashboard/admin/creation/` to keep admin UI co-located.
- SDEs may move files to `src/components/...` if preferred; above is the recommended layout for the current codebase.

---

## 3. Explanation of Each Component

### AddProjectDialog
- Purpose: Add or edit a Project record via a modal dialog.
- Managed states:
  - loading, startDateState, endDateState
  - clients, employees, clientPMs (local lists)
  - formData object with keys:
    projectNo, solProjectNo, name, description, clientId, solTLId, clientPm, status, priority, progress, branch, startDate, endDate, expectedCompletion, estimationDate, totalDays, totalProjectHours, actualProjectHours, totalSheetQty, weightTonnage, projectComplexity, solJobNo, projectType, projectSubType
- Fields to save to DB (when backend added): all formData properties listed above.
- Backend placeholders: look for `// TODO: backend logic placeholder` comments inside the component. Replace those with API calls to create/update a project.
- Trigger from Admin Console using:
  ```jsx
  <AddProjectDialog
    hideTrigger
    open={openAdd}
    onOpenChange={setOpenAdd}
    initialData={editProject}
    isEdit={!!editProject}
    onProjectAdded={reloadProjects}
  />
  ```

### AddClientDialog
- Purpose: Create/Edit a client and its configuration.
- Basic client states: name, email, contactNo, address, notes, etc.
- Advanced configuration section (toggleable "Show configuration"):
  - Revision structure flags
  - Log options (transmittal, submittal, complete)
  - Sheet column toggles (colFinish, colItemQty, colBfaDate)
  - Sheet size options
  - Notes
- The dialog now includes the FolderStructure (ClientConfig) panel when "Show folder structure" is checked.
- Backend placeholders: form submission and any saves include `// TODO: backend logic placeholder`. The SDE will need to replace these with create/update client API calls and persist client configuration JSON.
- Trigger from Admin Console:
  ```jsx
  <AddClientDialog
    hideTrigger
    open={openAddClient}
    onOpenChange={setOpenAddClient}
    initialData={editClient}
    isEdit={!!editClient}
    onClientAdded={reloadClients}
  />
  ```

### AddTeamLeadDialog
- Purpose: Create/Edit team leads (TLs) and manage their team member rows.
- States maintained (frontend):
  - loading, name, email, extension, password, showingCopied
  - empSearch, loadingEmployees, employees (simulated list), selectedExistingId
  - teamMembers (array of { id, name, role })
  - notes
- Behaviors preserved:
  - Auto-generate temporary password
  - Copy password to clipboard with "Copied" temporary indicator (replaces toast with console.log)
  - Reset password generation
  - Add / remove team member rows
  - Load an existing employee into the form by clicking an employee row
  - Prefill fields on edit using `initialData` and `isEdit`
- Backend placeholders: on submit, component logs payload and closes:
  ```js
  // TODO: save team lead (placeholder)
  console.log("SUBMIT TL", {...});
  onAdded?.();
  setDialogOpen(false);
  ```
- Wiring to Admin Console (already applied in `page.tsx`):
  ```jsx
  <AddTeamLeadDialog
    hideTrigger
    open={openAddTL}
    onOpenChange={setOpenAddTL}
    initialData={editTL}
    isEdit={!!editTL}
    onAdded={() => { setEditTL(null); setOpenAddTL(false); }}
  />
  ```

### AddClientPMDialog
- Purpose: Create/Edit Client Project Manager (Client PM) users.
- Controlled states:
  - name, email, clientId, password, loading, clients (list), clientOpen (popover toggle)
- The client selector is implemented using a Popover + Command-like menu (search/filter) to match original UX.
- `randomPassword()` function remains for temporary password generation.
- Backend placeholders: on submit:
  ```js
  // TODO: backend save placeholder
  console.log("SUBMIT CLIENT PM", { name, email, clientId, password });
  onAdded?.();
  setDialogOpen(false);
  ```
- Wiring to Admin Console (already applied in `page.tsx`):
  ```jsx
  <AddClientPMDialog
    hideTrigger
    open={openAddClientPM}
    onOpenChange={setOpenAddClientPM}
    initialData={editClientPM}
    isEdit={!!editClientPM}
    onAdded={() => { setEditClientPM(null); setOpenAddClientPM(false); }}
  />
  ```

### ClientConfig (FolderStructure)
- Purpose: Interactive builder for project folder / zip / file structure.
- Key states:
  - mainZip (string)
  - sections (array of sections: folder | zip | file)
  - defaultFileDetails: { category, size, extension, electronicName }
- Features preserved:
  - Add Folder / Add Zip / Add File
  - Nested sections and controls
  - Per-file metadata (category, size, extension, electronicName)
  - Radio group for file type (Uploaded, Extra, Others)
  - Remove section
- Zustand usage:
  - A Zustand store (`src/stores/clientStore.jsx`) holds `folderStructure` and `setFolderStructure`.
  - Component reads initial value from store on mount, and updates the store when `mainZip` or `sections` change.
- Backend: No backend calls implemented. The persisted Zustand object should be sent to backend by SDE as needed.
- Expected payload for backend from this component:
  ```json
  {
    "mainZip": "string",
    "sections": [
      {
        "type": "folder" | "zip" | "file",
        "name": "string",
        "fileType": "Uploaded" | "Extra" | "Others",
        "fileDetails": {
          "category": "...",
          "size": "A1",
          "extension": "pdf",
          "electronicName": "All"
        }
      },
      ...
    ]
  }
  ```

---

## 4. Admin Console Integration Instructions

Dialogs are integrated into `src/app/dashboard/admin/creation/page.tsx`. Each dialog accepts:
- `open` (boolean) – controlled open state
- `onOpenChange` (fn) – setter
- `initialData` – object to prefill when editing
- `isEdit` – boolean
- `onXAdded/onAdded/onProjectAdded` – callback invoked after successful add (currently frontend-only)

Example usage (projects):
```jsx
<AddProjectDialog
  hideTrigger
  open={openAdd}
  onOpenChange={setOpenAdd}
  initialData={editProject}
  isEdit={!!editProject}
  onProjectAdded={reloadProjects}
/>
```

Replace `reloadProjects` with a function that refreshes the projects list from backend. Equivalent wiring patterns are used for clients, team leads, and client PMs in `page.tsx`.

---

## 5. Backend Integration Guide

This section outlines what backend work the SDE must implement for each component.

### General
- Replace `// TODO: backend logic placeholder` comment blocks with concrete API calls.
- Add proper error handling and display feedback in UI (toast / inline errors).
- Implement authentication checks and permission enforcement.

### AddProjectDialog
- API endpoints:
  - POST `/api/projects` — create project
  - PUT `/api/projects/:id` — update project
  - GET `/api/clients` — clients list
  - GET `/api/employees` — TLs and employee lists
- DB tables: projects, projects_metadata (if needed), relations to clients and employees
- Payload example:
  ```json
  {
    "projectNo": "...",
    "name": "...",
    "clientId": 123,
    "startDate": "YYYY-MM-DD",
    "endDate": "...",
    "...": "other formData fields"
  }
  ```

### AddClientDialog
- API endpoints:
  - POST `/api/clients` — create client (persist config JSON)
  - PUT `/api/clients/:id` — update client
- DB tables: clients (columns for configuration JSON)
- Store configuration as JSON:
  - `configuration` column may contain the revision/log/sheet settings and `folderStructure` object
- Payload example:
  ```json
  {
    "name": "...",
    "email": "...",
    "configuration": { /* revision/log/sheet columns and folderStructure */ }
  }
  ```

### AddTeamLeadDialog
- API endpoints:
  - POST `/api/team_leads` — create TL (with team info)
  - PUT `/api/team_leads/:id` — update TL
  - GET `/api/employees?search=...` — employees search
- DB tables: users (or team_leads), tl_team_members
- Password handling:
  - Temporary password shown in the UI must NOT be stored in plaintext.
  - Backend must hash passwords (bcrypt/argon2) and store only the hash.
  - If sending temporary password to user, do so via secure channel (email) from backend.

### AddClientPMDialog
- API endpoints:
  - POST `/api/users` — create user with userType = "client"
  - PUT `/api/users/:id` — update user
- Required backend checks:
  - Ensure userType is set to client
  - Validate `clientId` exists and user has appropriate permissions

### ClientConfig (FolderStructure)
- Backend must accept and persist the `folderStructure` object (example payload above).
- Recommended endpoint: POST/PUT `/api/clients/:id/folder-structure`
- The backend should validate section types and file metadata.

---

## 6. Future Enhancements

Suggested improvements when wiring backend:
- Replace inline placeholders with an API service module (e.g., `src/lib/api/clients.js`) for consistent calls and easier testing.
- Add robust error handling and user notifications (toasts, inline form errors).
- Use optimistic UI updates with rollbacks on failure.
- Add server-side validation of submitted payloads.
- Add loading spinners tied to real network requests.
- Add confirmation dialogs for destructive actions (deletes).
- Consider extracting shared form controls into smaller components (Select, DatePicker, FileMetadataRow).

---

## 7. Summary

What was created:
- JavaScript (React) dialog components for Project, Client, Team Lead, and Client PM creation with UI identical to original.
- ClientConfig/FolderStructure module recreated and wired to a Zustand store for full frontend functionality.
- Admin Console page wired to open these dialogs and append placeholder results to local lists.

How SDEs integrate backend:
- Replace all `// TODO: backend logic placeholder` sections with real API calls, validating payloads and hashing passwords.
- Persist `folderStructure` object to the backend using the recommended structure.

Paths and references:
- See `src/app/dashboard/admin/creation/` for the dialog implementations and `src/stores/clientStore.jsx` for Zustand store.

