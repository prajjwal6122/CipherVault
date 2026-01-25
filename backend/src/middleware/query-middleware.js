/**
 * Query Middleware
 * Handles pagination, filtering, and query parameter processing
 */

/**
 * Pagination middleware
 * Adds page and pageSize to req.query
 */
const paginate = (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(req.query.pageSize) || 20),
  );

  req.query.page = page;
  req.query.pageSize = pageSize;
  req.query.skip = (page - 1) * pageSize;

  next();
};

/**
 * Filter records middleware
 * Builds filter object from query parameters
 */
const filterRecords = (req, res, next) => {
  const filters = {};

  // Extract filter parameters
  if (req.query.recordType) {
    filters.recordType = req.query.recordType;
  }

  if (req.query.tags) {
    // Handle comma-separated or array format
    const tagList = Array.isArray(req.query.tags)
      ? req.query.tags
      : req.query.tags.split(",").map((t) => t.trim());
    filters.tags = { $in: tagList };
  }

  if (req.query.search) {
    // Search in multiple fields
    filters.$or = [
      {
        "metadata.originalFileName": {
          $regex: req.query.search,
          $options: "i",
        },
      },
      { recordType: { $regex: req.query.search, $options: "i" } },
      { tags: { $in: [new RegExp(req.query.search, "i")] } },
    ];
  }

  if (req.query.startDate || req.query.endDate) {
    filters.createdAt = {};
    if (req.query.startDate) {
      filters.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filters.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  // Handle deleted filter
  if (req.query.includeDeleted !== "true") {
    filters.deletedAt = null;
  }

  req.query.filters = filters;
  next();
};

/**
 * Sort middleware
 * Handles sorting parameters
 */
const sort = (req, res, next) => {
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  // Whitelist allowed sort fields
  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "recordType",
    "ownerEmail",
    "tags",
  ];

  if (!allowedSortFields.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_SORT_FIELD",
        message: `Sort by must be one of: ${allowedSortFields.join(", ")}`,
      },
    });
  }

  req.query.sort = { [sortBy]: sortOrder };
  next();
};

/**
 * Search middleware
 * Enhances search with fuzzy matching support
 */
const search = (req, res, next) => {
  if (!req.query.search) {
    next();
    return;
  }

  const searchTerm = req.query.search.trim();

  if (searchTerm.length < 2) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_SEARCH",
        message: "Search term must be at least 2 characters",
      },
    });
  }

  // Build advanced search query
  req.query.searchTerm = searchTerm;
  next();
};

/**
 * Audit log filter middleware
 * Specific filtering for audit logs
 */
const filterAuditLogs = (req, res, next) => {
  const filters = {};

  if (req.query.action) {
    filters.action = req.query.action;
  }

  if (req.query.userId) {
    filters.userId = req.query.userId;
  }

  if (req.query.userEmail) {
    filters.userEmail = req.query.userEmail;
  }

  if (req.query.status) {
    filters.status = req.query.status;
  }

  if (req.query.ipAddress) {
    filters.ipAddress = req.query.ipAddress;
  }

  if (req.query.startDate || req.query.endDate) {
    filters.createdAt = {};
    if (req.query.startDate) {
      filters.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filters.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  req.query.filters = filters;
  next();
};

/**
 * Build MongoDB query object from filters
 */
const buildMongoQuery = (filters = {}) => {
  const query = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    // Handle MongoDB operators
    if (typeof value === "object" && !Array.isArray(value)) {
      query[key] = value;
    } else if (Array.isArray(value)) {
      query[key] = { $in: value };
    } else {
      query[key] = value;
    }
  }

  return query;
};

module.exports = {
  paginate,
  filterRecords,
  sort,
  search,
  filterAuditLogs,
  buildMongoQuery,
};
