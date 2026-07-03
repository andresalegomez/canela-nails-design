const { SystemLog } = require('../models');

const logAction = async (userId, action, entityType, entityId, details, ipAddress) => {
  try {
    await SystemLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
};

const loggerMiddleware = (req, res, next) => {
  req.logAction = (action, entityType, entityId, details) => {
    const ip = req.ip || req.connection?.remoteAddress;
    logAction(req.user?.id, action, entityType, entityId, details, ip);
  };
  next();
};

module.exports = { logAction, loggerMiddleware };
