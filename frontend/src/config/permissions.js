import PERMISSIONS from './permissions.json';

// The same list the API enforces (backend/src/config/permissions.json; a test keeps them equal).
// Hiding something here is only for a tidy screen: the API refuses it regardless.

/** True when the user's role holds any of the named permissions. */
export const can = (user, ...permissions) => permissions.some((permission) => {
    const roles = PERMISSIONS[permission];
    if (!Array.isArray(roles)) throw new Error(`Unknown permission: ${permission}`);
    return Boolean(user?.role) && roles.includes(user.role);
});
