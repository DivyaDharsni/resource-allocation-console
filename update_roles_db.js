
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

const Member = mongoose.models.Member || mongoose.model('Member', {
    role: String
});

async function updateRoles() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        const result = await Member.updateMany(
            { role: 'Head' },
            { $set: { role: 'Manager' } }
        );

        console.log(`Updated ${result.modifiedCount} records from 'Head' to 'Manager'.`);
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

updateRoles();
