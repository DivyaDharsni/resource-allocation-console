const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Models
const Member = mongoose.models.Member || mongoose.model('Member', {
    name: String,
    id: { type: String, unique: true },
    dept: String,
    role: String,
    baseExp: String,
    refDate: String
});

const Project = mongoose.models.Project || mongoose.model('Project', {
    name: String,
    code: { type: String, unique: true },
    start: String,
    end: String,
    days: Number
});

const Assignment = mongoose.models.Assignment || mongoose.model('Assignment', {
    empId: String,
    projCode: String,
    start: String,
    end: String,
    days: Number
});

// Helpers
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

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    await mongoose.connect(MONGODB_URI);
    cachedDb = mongoose.connection;
    return cachedDb;
}

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        await connectToDatabase();

        const path = event.path.replace(/\.netlify\/functions\/api/, '').replace(/\/api/, '');
        const method = event.httpMethod;

        // GET: Members
        if (path === '/members' && method === 'GET') {
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
            return { statusCode: 200, headers, body: JSON.stringify(processed) };
        }

        // GET: Projects
        if (path === '/projects' && method === 'GET') {
            const projects = await Project.find({});
            return { statusCode: 200, headers, body: JSON.stringify(projects) };
        }

        // GET: Assignments
        if (path === '/assignments' && method === 'GET') {
            const assignments = await Assignment.find({});
            return { statusCode: 200, headers, body: JSON.stringify(assignments) };
        }

        // POST: Add Project
        if (path === '/add-project' && method === 'POST') {
            const project = JSON.parse(event.body);
            if (!project.days) {
                project.days = Math.ceil((new Date(project.end) - new Date(project.start)) / 86400000);
            }
            await Project.create(project);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // POST: Add Member
        if (path === '/add-member' && method === 'POST') {
            const member = JSON.parse(event.body);
            const today = new Date().toISOString().split('T')[0];
            await Member.create({
                ...member,
                baseExp: member.exp,
                refDate: today
            });
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // POST: Update Member
        if (path === '/update-member' && method === 'POST') {
            const member = JSON.parse(event.body);
            await Member.updateOne({ id: member.id }, member);
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // POST: Add Assignment
        if (path === '/add-assignment' && method === 'POST') {
            const a = JSON.parse(event.body);
            await Assignment.findOneAndUpdate(
                { empId: a.empId, projCode: a.projCode, start: a.start, end: a.end },
                { days: a.days },
                { upsert: true }
            );
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        // POST: Update Assignment
        if (path === '/update-assignment' && method === 'POST') {
            const data = JSON.parse(event.body);
            const days = data.days || Math.ceil((new Date(data.newEnd) - new Date(data.newStart)) / 86400000);
            await Assignment.updateOne(
                { empId: data.empId, projCode: data.projCode, start: data.oldStart, end: data.oldEnd },
                { start: data.newStart, end: data.newEnd, days: days }
            );
            return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: "Path not found: " + path }) };

    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
