const { Warranty } = require('../models');
const { addMonths, reminderMonths } = require('./warranty');
const { notifyUser } = require('./notify');

const MAX_PER_RUN = 200;
const REMIND_FOR_YEARS = 5; // stop reminding long after purchase

// Sends a cleaning reminder for every warranty whose next maintenance date has arrived,
// then moves that date forward. The date is claimed atomically, so two servers can't send the same reminder twice.
async function runMaintenanceReminders(now = new Date()) {
  const every = await reminderMonths();
  const due = await Warranty.find({
    status: { $ne: 'void' },
    nextMaintenanceDate: { $lte: now },
    purchaseDate: { $gt: addMonths(now, -12 * REMIND_FOR_YEARS) },
  })
    .populate('product', 'name')
    .sort('nextMaintenanceDate')
    .limit(MAX_PER_RUN);

  let sent = 0;
  for (const w of due) {
    const claimed = await Warranty.findOneAndUpdate(
      { _id: w._id, nextMaintenanceDate: w.nextMaintenanceDate },
      { nextMaintenanceDate: addMonths(now, every), lastReminderAt: now }
    );
    if (!claimed) continue;
    await notifyUser(w.customer, {
      type: 'maintenance_reminder',
      title: 'Time to clean your air conditioner',
      message: `Your ${w.product?.name || 'air conditioner'} (serial ${w.serialNumber}) is due for periodic cleaning. Regular cleaning keeps it efficient and cooling well. You can request a cleaning service from your account.`,
      link: '/account/service-requests',
    });
    sent += 1;
  }
  return { checked: due.length, sent };
}

module.exports = { runMaintenanceReminders };