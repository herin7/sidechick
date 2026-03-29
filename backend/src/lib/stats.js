function calculateStreak(rows) {
  const dates = rows.map((row) => row.solved_date);
  if (dates.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let index = 0;
  let streak = 0;

  while (index < dates.length) {
    const expected = new Date(today);
    expected.setUTCDate(today.getUTCDate() - index);
    const expectedDate = expected.toISOString().slice(0, 10);

    if (dates[index] !== expectedDate) {
      if (index === 0) {
        const yesterday = new Date(today);
        yesterday.setUTCDate(today.getUTCDate() - 1);
        if (dates[index] !== yesterday.toISOString().slice(0, 10)) {
          return 0;
        }
      } else {
        break;
      }
    }

    streak += 1;
    index += 1;
  }

  return streak;
}

module.exports = {
  calculateStreak
};
