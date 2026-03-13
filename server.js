/**
 * ============================================================
 *  DANPREL ENGINEERING AUTOMATION
 *  Resource Allocation Console – MongoDB Cloud Server
 * ============================================================
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const MONGODB_URI = process.env.MONGODB_URI;

// ── MongoDB Connection ────────────────────────────────────────
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ── Models ───────────────────────────────────────────────────
const Member = mongoose.model('Member', {
    name: String,
    id: { type: String, unique: true },
    dept: String,
    role: String,
    baseExp: String,
    refDate: String
});

const Project = mongoose.model('Project', {
    name: String,
    code: { type: String, unique: true },
    start: String,
    end: String,
    days: Number
});

const Assignment = mongoose.model('Assignment', {
    empId: String,
    projCode: String,
    start: String,
    end: String,
    days: Number
});

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

// ── Helpers ──────────────────────────────────────────────────
function parseExp(val) {
    if (!val) return { y: 0, m: 0 };
    val = String(val).toUpperCase().trim();
    if (val.includes('MONTH')) {
        let m = parseInt(val) || 0;
        return { y: Math.floor(m / 12), m: m % 12 };
    }
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
    const urlPath = req.url.split('?')[0];

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // API: Members
    if (urlPath === '/api/members' && req.method === 'GET') {
        try {
            const members = await Member.find({});
            const processed = members.map(m => ({
                name: m.name,
                id: m.id,
                dept: m.dept,
                role: m.role,
                exp: getLiveExp(m.baseExp, m.refDate),
                _baseExp: m.baseExp,
                _refDate: m.refDate
            }));
            return json(res, 200, processed);
        } catch (e) { return json(res, 500, { error: e.message }); }
    }

    // API: Projects
    if (urlPath === '/api/projects' && req.method === 'GET') {
        try {
            const projects = await Project.find({});
            return json(res, 200, projects);
        } catch (e) { return json(res, 500, { error: e.message }); }
    }

    // API: Assignments
    if (urlPath === '/api/assignments' && req.method === 'GET') {
        try {
            const assignments = await Assignment.find({});
            return json(res, 200, assignments);
        } catch (e) { return json(res, 500, { error: e.message }); }
    }

    // API: Add Project
    if (urlPath === '/api/add-project' && req.method === 'POST') {
        try {
            const project = JSON.parse(await readBody(req));
            if (!project.days) {
                project.days = Math.ceil((new Date(project.end) - new Date(project.start)) / 86400000);
            }
            await Project.create(project);
            return json(res, 200, { success: true });
        } catch (e) { return json(res, 400, { error: e.message }); }
    }

    // API: Add Member
    if (urlPath === '/api/add-member' && req.method === 'POST') {
        try {
            const member = JSON.parse(await readBody(req));
            const today = new Date().toISOString().split('T')[0];
            await Member.create({
                ...member,
                baseExp: member.exp,
                refDate: today
            });
            return json(res, 200, { success: true });
        } catch (e) { return json(res, 400, { error: e.message }); }
    }

    // API: Update Member
    if (urlPath === '/api/update-member' && req.method === 'POST') {
        try {
            const member = JSON.parse(await readBody(req));
            await Member.updateOne({ id: member.id }, member);
            return json(res, 200, { success: true });
        } catch (e) { return json(res, 400, { error: e.message }); }
    }

    // API: Add Assignment
    if (urlPath === '/api/add-assignment' && req.method === 'POST') {
        try {
            const a = JSON.parse(await readBody(req));
            await Assignment.create(a);
            return json(res, 200, { success: true });
        } catch (e) { return json(res, 400, { error: e.message }); }
    }

    // API: Update Assignment
    if (urlPath === '/api/update-assignment' && req.method === 'POST') {
        try {
            const data = JSON.parse(await readBody(req));
            const days = data.days || Math.ceil((new Date(data.newEnd) - new Date(data.newStart)) / 86400000);
            await Assignment.updateOne(
                { empId: data.empId, projCode: data.projCode, start: data.oldStart, end: data.oldEnd },
                { start: data.newStart, end: data.newEnd, days: days }
            );
            return json(res, 200, { success: true });
        } catch (e) { return json(res, 400, { error: e.message }); }
    }

    // Static files
    const relative = urlPath === '/' ? 'resource.html' : urlPath.slice(1);
    const filePath = path.join(ROOT_DIR, relative);
    const ext = path.extname(filePath).toLowerCase();

    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}\n`);
});
