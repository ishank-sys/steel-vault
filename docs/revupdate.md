# Update to Previous Revision Handling in `PublishDrawing.jsx`

## Overview

This update addresses an issue where the **Previous Revision** column displayed incorrect values after uploading Excel and PDF files. In certain cases, the component showed revision history belonging to a different package, even when the currently selected package had no previous submissions.

The fixes described below ensure that previous-revision data is always **package-specific**, **accurate**, and **consistent between the table and the “Previous Submissions” modal**.

---

## Problem Summary

The component originally refreshed previous-revision data whenever the `drawings` array changed:

```js
useEffect(() => { ... }, [selectedProjectId, selectedPackageId, drawings]);
```

Since uploading Excel or attaching PDFs modifies `drawings`, this caused the revision-lookup process to run again.
The backend job used by this process could return revision history for drawings with matching numbers from **other packages**, leading to unexpected results.

### Symptoms Observed

* Before uploading files: “Previous Submissions” modal showed *no records* (correct).
* After uploading Excel/PDFs: the table began showing previous revisions from unrelated packages (incorrect).
* Clicking “Previous” again then displayed the same incorrect revisions.

---

## Changes Implemented

### 1. Removed `drawings` from the revision-lookup trigger

Previous revisions should load only when the project or package changes—not when local drawing rows update.

**Before:**

```js
}, [selectedProjectId, selectedPackageId, drawings]);
```

**After:**

```js
}, [selectedProjectId, selectedPackageId]);
```

This prevents unintended reloads of previous-revision data during normal file-upload operations.

---

### 2. Revision display is now gated by the presence of `prevRows`

The table will now show a previous revision **only if the backend returned previous submissions for the selected package**.

A new condition ensures that the lookup only runs when `prevRows.length > 0`:

```js
const hasAnyPrevRows = Array.isArray(prevRows) && prevRows.length > 0;
let prevRev = "";

if (isDrawing && hasAnyPrevRows) {
    // filename-based match first
    // fallback to drgNo + category
}
```

If `prevRows` is empty, the column displays:

```
NA
```

This keeps the table in sync with the “Previous Submissions” modal and prevents cross-package revision leakage.

---

### 3. Updated `renderTable` dependencies

Since the table now depends on `prevRows`, the callback signature was updated:

```js
const renderTable = useCallback(
  (...) => { ... },
  [
    openModal,
    drawings,
    setDrawings,
    prevRevMap,
    prevRevLoading,
    revisionConflicts,
    prevRows, // included for correctness
  ]
);
```

---

## Result

With these adjustments:

* Previous revisions are **limited to the selected project and package**.
* Uploading Excel/PDF files no longer triggers unintended revision lookups.
* The “Previous Submissions” modal and the table now always reflect the same source of truth.
* Packages that have never been uploaded before consistently show `NA` in the Previous Revision column.

---

## Notes

No backend changes were required for this fix, but the frontend now correctly prevents unrelated previous-revision entries from being surfaced.

If package-scoped filtering is later required at the backend level, this can be added to the `validate-conflicts` job.


