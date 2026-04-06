const bcrypt = require("bcryptjs");
const hash = "$2b$10$dwQeNXWW4AxiusTeA6GfWeGcrgadcwV4L2YMrJMt1mk7vL6MfFyGq";
bcrypt.compare("admin123", hash).then(r => console.log("Match:", r));
