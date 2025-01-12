const mongoose = require("mongoose");

const connectDB = async () => {
    await mongoose.connect(
        "mongodb+srv://Arahanth:MftpTuEzF7ILWZcY@nodejs.dkfd9.mongodb.net/devTinder"
    );
};

module.exports = connectDB;