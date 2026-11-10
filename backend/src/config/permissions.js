const PERMISSIONS = require('./permissions.json');

/** True when `role` holds `permission`. Unknown permission names throw, so typos fail loudly. */
function can(role, permission) {
    const roles = PERMISSIONS[permission];
    if (!Array.isArray(roles)) throw new Error(`Unknown permission: ${permission}`);
    return roles.includes(role);
}

module.exports = { PERMISSIONS, can };
