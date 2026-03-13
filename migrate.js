/**
 * ============================================================
 *  DANPREL ENGINEERING AUTOMATION
 *  Database Migration Script (CSV → MongoDB)
 * ============================================================
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const CSV_FILE = path.join(__dirname, 'resources.csv');
const PROJECTS_CSV = path.join(__dirname, 'projects.csv');
const ASSIGNMENTS_CSV = path.join(__dirname, 'assignments.csv');

// Models
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

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('connected to MongoDB...');

        // 1. Migrate Members
        if (fs.existsSync(CSV_FILE)) {
            const raw = fs.readFileSync(CSV_FILE, 'utf8');
            const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(1);
            const today = new Date().toISOString().split('T')[0];

            for (const line of lines) {
                const p = line.split(',').map(s => s.trim());
                if (!p[0] || !p[1]) continue;
                
                try {
                    await Member.findOneAndUpdate(
                        { id: p[1] },
                        { 
                            name: p[0], 
                            dept: p[2], 
                            role: p[3], 
                            baseExp: p[4] || '0', 
                            refDate: p[5] || today 
                        },
                        { upsert: true }
                    );
                    console.log(`Migrated Member: ${p[0]}`);
                } catch (err) { console.error(`Failed ${p[0]}: ${err.message}`); }
            }
        }

        // 2. Migrate Projects
        if (fs.existsSync(PROJECTS_CSV)) {
            const raw = fs.readFileSync(PROJECTS_CSV, 'utf8');
            const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(1);
            for (const line of lines) {
                const p = line.split(',').map(s => s.trim());
                if (!p[0] || !p[1]) continue;
                try {
                    await Project.findOneAndUpdate(
                        { code: p[1] },
                        { name: p[0], start: p[2], end: p[3], days: parseInt(p[4]) || 0 },
                        { upsert: true }
                    );
                    console.log(`Migrated Project: ${p[0]}`);
                } catch (err) { }
            }
        }

        // 3. Migrate Assignments
        if (fs.existsSync(ASSIGNMENTS_CSV)) {
            const raw = fs.readFileSync(ASSIGNMENTS_CSV, 'utf8');
            const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(1);
            for (const line of lines) {
                const p = line.split(',').map(s => s.trim());
                if (!p[0] || !p[1]) continue;
                try {
                    await Assignment.findOneAndUpdate(
                        { empId: p[0], projCode: p[1], start: p[2], end: p[3] },
                        { days: parseInt(p[4]) || 0 },
                        { upsert: true }
                    );
                    console.log(`Migrated Assignment: ${p[0]} -> ${p[1]}`);
                } catch (err) { console.error(`Failed Assignment: ${err.message}`); }
            }
        }

        console.log('\n✅ MIGRATION COMPLETE! Everything is now in MongoDB.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e.message);
        process.exit(1);
    }
}

migrate();
