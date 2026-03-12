/**
 * ============================================================
 *  DANPREL ENGINEERING AUTOMATION
 *  Resource Allocation – Preloaded Employee Data
 * ============================================================
 *
 *  HOW TO EDIT:
 *  ─────────────────────────────────────────────────────────
 *  Edit the CSV rows inside RESOURCE_CSV below.
 *  Each row follows the format:
 *
 *    Name, Employee ID, Department, Role, Experience(Yrs)
 *
 *  Allowed values for Department:
 *    • Mechanical Assembly
 *    • Electrical Integration
 *    • Software Development
 *
 *  Allowed values for Role:
 *    • Head      (Department Head)
 *    • Lead      (Department Lead)
 *    • Member    (Team Member)
 *
 *  ─────────────────────────────────────────────────────────
 *  To add a new employee → add a new line in the CSV block.
 *  To remove  an employee → delete their line.
 *  Do NOT change the header line (first line).
 *  ============================================================
 */

const RESOURCE_CSV = `
Name,Employee ID,Department,Role,Experience(Yrs)
Arjun Mehta,EMP001,Mechanical Assembly,Head,10
Priya Sharma,EMP002,Electrical Integration,Lead,7
Ravi Kumar,EMP003,Software Development,Member,5
Sneha Patel,EMP004,Mechanical Assembly,Lead,8
Kiran Das,EMP005,Electrical Integration,Member,3
`.trim();

/* ─── Auto-parser: converts CSV rows → JS objects ─────────────────
   Each employee starts with NO projects assigned.
   Projects are added from the dashboard via "Add Project" button.
──────────────────────────────────────────────────────────────────── */
window.INITIAL_RESOURCES = (function () {
    const lines = RESOURCE_CSV.split('\n').map(l => l.trim()).filter(Boolean);
    // Skip header row (index 0)
    return lines.slice(1).map(line => {
        const parts = line.split(',').map(s => s.trim());
        const name  = parts[0] || '';
        const id    = parts[1] || '';
        const dept  = parts[2] || 'Mechanical Assembly';
        const role  = parts[3] || 'Member';
        const exp   = parseInt(parts[4]) || 1;
        return { name, id, dept, role, exp, projects: [] };
    }).filter(r => r.name); // skip empty rows
})();
