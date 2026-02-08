const fs = require('fs').promises;
const path = require('path');

// Simple user storage using JSON file
const USERS_FILE = path.join(__dirname, '../../users.json');

// Initialize users file if it doesn't exist
async function initUsersFile() {
    try {
        await fs.access(USERS_FILE);
    } catch {
        await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
    }
}

// Read users from file
async function getUsers() {
    await initUsersFile();
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
}

// Save users to file
async function saveUsers(users) {
    await initUsersFile();
    await fs.writeFile(USERS_FILE, JSON.stringify({ users }, null, 2));
}

// Check if user exists
async function userExists(email) {
    const { users } = await getUsers();
    return users.some(user => user.email === email.toLowerCase());
}

// Add new user
async function addUser(userData) {
    const { users } = await getUsers();
    
    // Check if user already exists
    if (users.some(user => user.email === userData.email.toLowerCase())) {
        throw new Error('User already exists');
    }
    
    // Add new user
    const newUser = {
        ...userData,
        email: userData.email.toLowerCase(),
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    
    users.push(newUser);
    await saveUsers(users);
    
    return newUser;
}

// Get user by email
async function getUser(email) {
    const { users } = await getUsers();
    return users.find(user => user.email === email.toLowerCase());
}

// Export functions for use in API endpoints
module.exports = {
    initUsersFile,
    getUsers,
    saveUsers,
    userExists,
    addUser,
    getUser
};
