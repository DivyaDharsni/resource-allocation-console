/**
 * ============================================================
 *  DANPREL ENGINEERING AUTOMATION
 *  Resource Allocation Console – Local File Server
 * ============================================================
 *
 *  Start this server once with:   node server.js
 *  Then open:  http://localhost:3000
 *
 *  What it does:
 *   - Serves resource.html and all static files
 *   - GET  /api/members     → reads resources.csv and returns JSON
 *   - POST /api/add-member  → appends new member to resources.csv
 *
 *  No npm install needed — uses only built-in Node.js modules.
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT_DIR = __dirname;
const CSV_FILE = path.join(ROOT_DIR, 'resources.csv');
const PROJECTS_CSV_FILE = path.join(ROOT_DIR, 'projects.csv');
const ASSIGNMENTS_CSV_FILE = path.join(ROOT_DIR, 'assignments.csv');

// ── MIME types ────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
};

// ── CSV helpers ───────────────────────────────────────────────
function parseExp(val) {
    if (!val) return { y: 0, m: 0 };
    val = String(val).toUpperCase().trim();
    if (val.includes('MONTH')) {
        let m = parseInt(val) || 0;
        return { y: Math.floor(m / 12), m: m % 12 };
    }
    // Handle Y.M format (e.g., 3.4 or 1.11)
    let parts = val.split('.');
    let y = parseInt(parts[0]) || 0;
    let m = parts[1] ? parseInt(parts[1]) : 0;
    return { y, m };
}

function getLiveExp(baseStr, refDateStr) {
    let base = parseExp(baseStr);
    if (!refDateStr) return `${base.y}.${base.m}`;

    let now = new Date();
    let ref = new Date(refDateStr);
    if (isNaN(ref)) return `${base.y}.${base.m}`;

    let monthsDiff = (now.getFullYear() - ref.getFullYear()) * 12 + (now.getMonth() - ref.getMonth());
    if (monthsDiff <= 0) return `${base.y}.${base.m}`;

    let totalMonths = base.y * 12 + base.m + monthsDiff;
    let newY = Math.floor(totalMonths / 12);
    let newM = totalMonths % 12;
    return `${newY}.${newM}`;
}

function readCSV() {
    try {
        if (!fs.existsSync(CSV_FILE)) return [];
        const raw = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const today = new Date().toISOString().split('T')[0];

        return lines.slice(1).map(line => {
            const parts = line.split(',').map(s => s.trim());
            let baseExp = parts[4] || '0';
            let refDate = parts[5] || today;
            let live = getLiveExp(baseExp, refDate);
            return {
                name: parts[0] || '',
                id: parts[1] || '',
                dept: parts[2] || '',
                role: parts[3] || 'Member',
                exp: live,
                _baseExp: baseExp,
                _refDate: refDate
            };
        }).filter(r => r.name && r.id);
    } catch (e) {
        console.error('Could not read resources.csv:', e.message);
        return [];
    }
}

function appendToCSV(member) {
    const clean = v => String(v).replace(/,/g, ';').replace(/\r?\n/g, ' ');
    const today = new Date().toISOString().split('T')[0];
    const line = `\n${clean(member.name)},${clean(member.id)},${clean(member.dept)},${clean(member.role)},${clean(member.exp)},${today}`;
    fs.appendFileSync(CSV_FILE, line, 'utf8');
}

function writeCSV(members) {
    const clean = v => String(v).replace(/,/g, ';').replace(/\r?\n/g, ' ');
    const today = new Date().toISOString().split('T')[0];
    let content = 'Name,Employee ID,Department,Role,Experience(Yrs),RefDate\n';
    members.forEach(m => {
        // Carry forward existing RefDate if available, otherwise use today
        let rDate = m._refDate || today;
        let bExp = m._baseExp || m.exp;
        content += `${clean(m.name)},${clean(m.id)},${clean(m.dept)},${clean(m.role)},${clean(bExp)},${rDate}\n`;
    });
    fs.writeFileSync(CSV_FILE, content, 'utf8');
}

// ── Projects CSV helpers ──────────────────────────────────────
function readProjectsCSV() {
    try {
        const raw = fs.readFileSync(PROJECTS_CSV_FILE, 'utf8');
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        // Skip header row (index 0)
        return lines.slice(1).map(line => {
            const parts = line.split(',').map(s => s.trim());
            return {
                name: parts[0] || '',
                code: parts[1] || '',
                start: parts[2] || '',
                end: parts[3] || '',
                days: parseInt(parts[4]) || 0
            };
        }).filter(p => p.name && p.code);
    } catch (e) {
        console.error('Could not read projects.csv:', e.message);
        return [];
    }
}

function appendToProjectsCSV(project) {
    const clean = v => String(v).replace(/,/g, ';').replace(/\r?\n/g, ' ');
    const line = `\n${clean(project.name)},${clean(project.code)},${clean(project.start)},${clean(project.end)},${clean(project.days)}`;
    fs.appendFileSync(PROJECTS_CSV_FILE, line, 'utf8');
    console.log(`  ✅ Project saved: ${project.name} (${project.code}) → projects.csv`);
}

// ── Assignments CSV helpers ───────────────────────────────────
function readAssignmentsCSV() {
    try {
        if (!fs.existsSync(ASSIGNMENTS_CSV_FILE)) {
            fs.writeFileSync(ASSIGNMENTS_CSV_FILE, 'Employee ID,Project Code,Start Date,End Date,Duration (Days)\n', 'utf8');
            return [];
        }
        const raw = fs.readFileSync(ASSIGNMENTS_CSV_FILE, 'utf8');
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        return lines.slice(1).map(line => {
            const parts = line.split(',').map(s => s.trim());
            return {
                empId: parts[0] || '',
                projCode: parts[1] || '',
                start: parts[2] || '',
                end: parts[3] || '',
                days: parseInt(parts[4]) || 0
            };
        }).filter(a => a.empId && a.projCode);
    } catch (e) {
        console.error('Could not read assignments.csv:', e.message);
        return [];
    }
}

function appendToAssignmentsCSV(a) {
    const clean = v => String(v).replace(/,/g, ';').replace(/\r?\n/g, ' ');
    const line = `\n${clean(a.empId)},${clean(a.projCode)},${clean(a.start)},${clean(a.end)},${clean(a.days)}`;
    fs.appendFileSync(ASSIGNMENTS_CSV_FILE, line, 'utf8');
    console.log(`  ✅ Assignment saved: ${a.empId} @ ${a.projCode} → assignments.csv`);
}

// ── Request helper ────────────────────────────────────────────
function json(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// ── HTTP Server ───────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const urlPath = req.url.split('?')[0];   // strip query string

    // ── CORS preflight ──
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ── API: GET /api/members ──
    if (urlPath === '/api/members' && req.method === 'GET') {
        return json(res, 200, readCSV());
    }

    // ── API: GET /api/projects ──
    if (urlPath === '/api/projects' && req.method === 'GET') {
        return json(res, 200, readProjectsCSV());
    }

    // ── API: GET /api/assignments ──
    if (urlPath === '/api/assignments' && req.method === 'GET') {
        return json(res, 200, readAssignmentsCSV());
    }

    // ── API: POST /api/add-project ──
    if (urlPath === '/api/add-project' && req.method === 'POST') {
        try {
            const body = await readBody(req);
            const project = JSON.parse(body);

            if (!project.name || !project.code || !project.start || !project.end) {
                return json(res, 400, { error: 'Missing required fields: name, code, start, end' });
            }

            // Check duplicate project code
            const existing = readProjectsCSV();
            if (existing.some(p => p.code.toUpperCase() === project.code.toUpperCase())) {
                return json(res, 409, { error: `Project code ${project.code} already exists in projects.csv` });
            }

            // Calculate duration if not provided
            if (!project.days) {
                project.days = Math.ceil((new Date(project.end) - new Date(project.start)) / 86400000);
            }

            appendToProjectsCSV(project);
            return json(res, 200, { success: true, project });

        } catch (e) {
            return json(res, 400, { error: 'Invalid request: ' + e.message });
        }
    }

    // ── API: POST /api/add-member ──
    if (urlPath === '/api/add-member' && req.method === 'POST') {
        try {
            const body = await readBody(req);
            const member = JSON.parse(body);

            if (!member.name || !member.id || !member.dept || !member.role) {
                return json(res, 400, { error: 'Missing required fields: name, id, dept, role' });
            }

            // Check duplicate employee code in CSV
            const existing = readCSV();
            if (existing.some(r => r.id.toUpperCase() === member.id.toUpperCase())) {
                return json(res, 409, { error: `Employee code ${member.id} already exists in resources.csv` });
            }

            appendToCSV(member);
            return json(res, 200, { success: true, member });

        } catch (e) {
            return json(res, 400, { error: 'Invalid request: ' + e.message });
        }
    }

    // ── API: POST /api/update-member ──
    if (urlPath === '/api/update-member' && req.method === 'POST') {
        try {
            const body = await readBody(req);
            const member = JSON.parse(body);

            if (!member.id) return json(res, 400, { error: 'Missing employee ID' });

            const members = readCSV();
            const searchId = String(member.id).trim().toUpperCase();
            const idx = members.findIndex(m => String(m.id).trim().toUpperCase() === searchId);

            if (idx === -1) {
                return json(res, 404, { error: `Employee ID "${member.id}" not found in resources.csv. Possible ID mismatch.` });
            }

            // Update record
            members[idx] = { ...members[idx], ...member };
            writeCSV(members);

            return json(res, 200, { success: true, member: members[idx] });

        } catch (e) {
            return json(res, 400, { error: 'Invalid request: ' + e.message });
        }
    }

    // ── API: POST /api/add-assignment ──
    if (urlPath === '/api/add-assignment' && req.method === 'POST') {
        try {
            const body = await readBody(req);
            const a = JSON.parse(body);

            if (!a.empId || !a.projCode || !a.start || !a.end) {
                return json(res, 400, { error: 'Missing required fields: empId, projCode, start, end' });
            }

            appendToAssignmentsCSV(a);
            return json(res, 200, { success: true, assignment: a });

        } catch (e) {
            return json(res, 400, { error: 'Invalid body: ' + e.message });
        }
    }

    // ── Static files ──
    const relative = urlPath === '/' ? 'resource.html' : urlPath.slice(1);
    const filePath = path.join(ROOT_DIR, relative);
    const ext = path.extname(filePath).toLowerCase();

    // Security: prevent path traversal
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found: ' + relative); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║   DANPREL Engineering Automation                ║');
    console.log('║   Resource Allocation Console — Server Ready    ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    console.log(`  🌐 Open in browser:  http://localhost:${PORT}`);
    console.log(`  📄 Members CSV:      ${CSV_FILE}`);
    console.log(`  📁 Projects CSV:     ${PROJECTS_CSV_FILE}`);
    console.log(`  🔗 Assignments CSV:  ${ASSIGNMENTS_CSV_FILE}`);
    console.log('\n  Members     → saved permanently to resources.csv');
    console.log('  Projects    → saved permanently to projects.csv');
    console.log('  Assignments → saved permanently to assignments.csv\n');
    console.log('  Press Ctrl+C to stop the server.\n');
});

server.on('error', e => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n  ❌ Port ${PORT} is already in use.`);
        console.error(`     Close the other process or change PORT in server.js.\n`);
    } else {
        console.error('\n  ❌ Server error:', e.message, '\n');
    }
    process.exit(1);
});
