/**
 * Authorization Middleware
 * Checks user roles and permissions
 */

/**
 * Check if user is admin
 */
const checkAdminRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Admin access required",
      },
    });
  }

  next();
};

/**
 * Check if user has specific role
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access requires one of these roles: ${allowedRoles.join(", ")}`,
        },
      });
    }

    next();
  };
};

/**
 * Check if user is analyst or admin
 */
const checkAnalystOrAdmin = (req, res, next) => {
  return checkRole("analyst", "admin")(req, res, next);
};

module.exports = {
  checkAdminRole,
  checkRole,
  checkAnalystOrAdmin,
};
