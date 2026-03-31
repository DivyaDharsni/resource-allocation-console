const mongoose = require('mongoose');
require('dotenv').config();
const MONGODB_URI = process.env.MONGODB_URI;
const Member = mongoose.models.Member || mongoose.model('Member', {
    id: { type: String, unique: true }
});
async function checkDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        const count = await Member.countDocuments({});
        console.log(`Member count: ${count}`);
        process.exit(0);
    } catch (err) {
        console.error('DB check failed:', err);
        process.exit(1);
    }
}
checkDB();
