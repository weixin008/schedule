// api/schedule-generator.js
const { ObjectId } = require('mongodb');

// A simple in-memory store to track the last assigned person for each position.
const rotationState = {};

/**
 * Generates a schedule based on defined rules.
 * @param {Db} db - The MongoDB database instance.
 * @param {string} startDate - The start date in YYYY-MM-DD format.
 * @param {string} endDate - The end date in YYYY-MM-DD format.
 * @returns {Promise<object>} - A promise that resolves to an object with the result of the generation.
 */
async function generateScheduleByRules(db, startDate, endDate) {
  const personnel = await db.collection('personnel').find({}).toArray();
  const positions = await db.collection('positions').find({}).toArray();
  const scheduleRules = await db.collection('schedule_rules').find({}).toArray();
  const schedulesCollection = db.collection('schedules');

  if (positions.length === 0) {
    return { success: false, message: '没有岗位数据' };
  }
  if (scheduleRules.length === 0) {
    return { success: false, message: '没有轮班规则' };
  }

  const generatedSchedules = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const currentDate = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];

    const applicableRules = scheduleRules.filter(rule => rule.enabled);

    for (const rule of applicableRules) {
      let shouldApply = false;
      let rulePositions = [];

      if (rule.type === 'weekly' && rule.pattern[dayName]?.enabled) {
        shouldApply = true;
        rulePositions = rule.pattern[dayName].positions;
      } else if (rule.type === 'daily' && rule.pattern.everyDay?.enabled) {
        shouldApply = true;
        rulePositions = rule.pattern.everyDay.positions;
      }

      if (shouldApply && rulePositions.length > 0) {
        for (const positionId of rulePositions) {
          const position = positions.find(p => p._id.toString() === positionId);
          if (!position) continue;

          const availablePersonnel = personnel.filter(p => 
            position.requiredTags.every(tag => p.tags.includes(tag))
          );

          if (availablePersonnel.length === 0) continue;

          // Simple rotation logic
          let lastIndex = rotationState[positionId] || -1;
          let nextIndex = (lastIndex + 1) % availablePersonnel.length;
          const selectedPerson = availablePersonnel[nextIndex];
          rotationState[positionId] = nextIndex;

          const schedule = {
            date: currentDate,
            positionId: new ObjectId(positionId),
            assignedPersonId: selectedPerson._id,
            createTime: new Date().toISOString(),
          };
          generatedSchedules.push(schedule);
        }
      }
    }
  }

  if (generatedSchedules.length > 0) {
    await schedulesCollection.insertMany(generatedSchedules);
  }

  return {
    success: true,
    scheduleCount: generatedSchedules.length,
    message: `成功生成 ${generatedSchedules.length} 条排班记录`,
  };
}

module.exports = {
  generateScheduleByRules,
};