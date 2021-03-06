describe('Formatting', function() {
  describe('time formatting', function() {
    let testCases = [
      { minutes: 0, time: '00:00' },
      { minutes: 59, time: '00:59' },
      { minutes: 60, time: '01:00' },
      { minutes: 90, time: '01:30' },
      { minutes: 600, time: '10:00' },
      { minutes: 600, time: '10:00' },
      { minutes: 720, time: '12:00' },
      { minutes: 780, time: '13:00' },
    ];
    testCases.forEach(function(tc) {
      it('should format ' + tc.minutes + ' as ' + tc.time, function() {
        expect(minutesToTime(tc.minutes)).toBe(tc.time);
      });
    });
  });
});
