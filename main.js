'use strict';

/**
 * @typedef {Object} Course
 * @property {string} name
 * @property {number} academicPoints - Number of academic points
 * @property {number} id - Course ID
 * @property {Group[]} groups
 * @
 */

/**
 * @typedef {Object} Faculty
 * @property {string} name
 * @property {Course[]} courses
 */

/**
 * @typedef {Faculty[]} Catalog
 */

/**
 * @typedef {Object} Settings
 * @property {number[]} selectedCourseNumbers
 */

const catalogUrl =
  'https://storage.googleapis.com/repy-176217.appspot.com/latest.json';

let selectedCourses = new Set();

/**
 * Catalog of all courses
 * @type {Catalog}
 */
let currentCatalog = null;

/**
 * Return an HTML description for a course
 *
 * @param {Course} course - Course to describe
 *
 * @returns {HTMLSpanElement}
 */
function htmlDescribeCourse(course) {
  let result = document.createElement('span');
  let pre = document.createElement('pre');
  pre.innerText = JSON.stringify(
    course,
    function(key, value) {
      if (['course', 'group', 'faculty'].includes(key)) {
        return undefined;
      } else {
        return value;
      }
    },
    4
  );
  result.appendChild(pre);
  return result;
}

const rightArrow = '&#9656;';
const downArrow = '&#9662;';

/**
 * Create a span for a course label, including info button
 *
 * @param {Course} course - Course to create label for
 *
 * @returns {HTMLSpanElement}
 */
function courseLabel(course) {
  let span = document.createElement('span');
  let infoLink = document.createElement('a');
  infoLink.innerHTML = rightArrow;
  infoLink.className = 'info-link';
  infoLink.href = '#/';
  span.textContent = ` ${course.id} ${course.name} `;
  infoLink.onclick = function() {
    if (!span.ttime3_expanded) {
      let infoDiv = document.createElement('div');
      span.infoDiv = infoDiv;
      infoDiv.appendChild(htmlDescribeCourse(course));
      // showCourseDebugInfo(course);
      span.appendChild(infoDiv);
      infoLink.innerHTML = downArrow;
      span.ttime3_expanded = true;
    } else {
      infoLink.innerHTML = rightArrow;
      span.ttime3_expanded = false;
      span.removeChild(span.infoDiv);
    }
  };
  span.appendChild(infoLink);
  return span;
}

/**
 * Write catalog selector to page.
 */
function writeCatalogSelector() {
  let facultiesDiv = document.getElementById('catalog');
  let facultyList = document.createElement('ul');

  facultiesDiv.innerHTML = '';
  facultiesDiv.appendChild(facultyList);
  currentCatalog.forEach(function(faculty) {
    let li = document.createElement('li');
    li.textContent = faculty.name + ' ';
    let semesterTag = document.createElement('span');
    semesterTag.className = 'semester-tag';
    semesterTag.textContent = faculty.semester;
    li.appendChild(semesterTag);

    let courseList = document.createElement('ul');
    li.appendChild(courseList);
    facultyList.appendChild(li);

    faculty.courses.forEach(function(course) {
      let btn = document.createElement('button');
      let label = courseLabel(course);
      btn.textContent = '+';
      let courseLi = document.createElement('li');
      courseLi.appendChild(btn);
      courseLi.appendChild(label);
      courseList.appendChild(courseLi);

      btn.onclick = function() {
        addSelectedCourse(course);
      };
    });
  });
}

/**
 * Save all settings to localStorage
 */
function saveSettings() {
  let selectedCourseNumbers = Array.from(selectedCourses).map(c => c.id);
  window.localStorage.ttime3_selectedCourses = JSON.stringify(
    selectedCourseNumbers
  );
  console.info(window.localStorage.ttime3_selectedCourses);
}

/**
 * Mark course as selected.
 *
 * @param {Course} course - Course to select
 */
function addSelectedCourse(course) {
  console.info('Selected', course);
  selectedCourses.add(course);
  saveSettings();
  refreshSelectedCourses();
}

/**
 * Add a course with a given ID
 *
 * @param {...number} ids - Course IDS
 */
function addSelectedCourseByID(...ids) {
  /* exported addSelectedCourseByID */
  ids.forEach(function(id) {
    let found = false;
    currentCatalog.forEach(function(faculty) {
      if (!found) {
        faculty.courses.forEach(function(course) {
          if (course.id == id) {
            addSelectedCourse(course);
            found = true;
            return;
          }
        });
      }
    });
    if (!found) {
      throw new Error('No course with ID ' + id);
    }
  });
}

/**
 * Mark course as unselected.
 *
 * @param {Course} course - Course to unselect
 */
function delSelectedCourse(course) {
  console.info('Unselected', course);
  selectedCourses.delete(course);
  saveSettings();
  refreshSelectedCourses();
}

/**
 * Redraw the list of selected courses
 *
 * TODO(lutzky): This is actually a bad idea and would cause flicker, better do
 * something neater.
 */
function refreshSelectedCourses() {
  let div = document.getElementById('selected-courses');
  div.innerHTML = '';
  let ul = document.createElement('ul');
  div.appendChild(ul);
  selectedCourses.forEach(function(course) {
    let li = document.createElement('li');
    let label = courseLabel(course);
    let btn = document.createElement('button');
    btn.innerText = '-';
    btn.onclick = function() {
      delSelectedCourse(course);
    };
    li.appendChild(btn);
    li.appendChild(label);
    ul.appendChild(li);
  });
}

/**
 * Start a worker to generate schedules
 */
function getSchedules() {
  /* exported getSchedules */
  let genButton = document.getElementById('generate-schedules');
  let spinner = document.getElementById('spinner');
  genButton.disabled = true;
  spinner.style.visibility = 'visible';

  let w = new Worker('scheduler_worker.js');
  // TODO(lutzky): Wrap worker with a Promise
  w.onmessage = function(e) {
    console.info('Received message from worker:', e);
    genButton.disabled = false;
    spinner.style.visibility = 'hidden';
    w.terminate();
    setPossibleSchedules(e.data);
  };
  w.postMessage(selectedCourses);
}

let possibleSchedules = [];
let currentSchedule = 0;

/**
 * Set the collection of possible schedules
 *
 * @param {Schedule[]} schedules - Possible schedules
 */
function setPossibleSchedules(schedules) {
  possibleSchedules = schedules;
  currentSchedule = 0;
  let div = document.getElementById('schedule-browser');
  document.getElementById('num-schedules').textContent = schedules.length;
  if (schedules.length > 0) {
    div.style.display = 'block';
  } else {
    div.style.display = 'none';
  }
  goToSchedule(0);
}

/**
 * Increment the current displayed schedule
 */
function nextSchedule() {
  /* exported nextSchedule */
  goToSchedule(currentSchedule + 1);
}

/**
 * Decrement the current displayed schedule
 */
function prevSchedule() {
  /* exported prevSchedule */
  goToSchedule(currentSchedule - 1);
}

const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Display schedule i, modulo the possible range 0-(numSchedules - 1)
 *
 * @param {number} i - schedule to show
 */
function goToSchedule(i) {
  let max = possibleSchedules.length;
  i = (i + max) % max;
  currentSchedule = i;
  document.getElementById('current-schedule-id').textContent = i + 1;
  let days = byDay(possibleSchedules[i]);

  let scheduleContents = document.getElementById('schedule-contents');
  scheduleContents.innerHTML = '';

  days.forEach(function(dayEvents) {
    let dayEntry = document.createElement('li');
    scheduleContents.appendChild(dayEntry);
    dayEntry.textContent = dayNames[dayEvents[0].day];
    let eventList = document.createElement('ul');
    dayEntry.appendChild(eventList);
    dayEvents.forEach(function(e) {
      let eventEntry = document.createElement('li');
      let startTime = minutesToTime(e.startMinute);
      let endTime = minutesToTime(e.endMinute);
      eventEntry.textContent = `${startTime}-${endTime} ${
        e.group.course.name
      } at ${e.location}`;
      eventList.appendChild(eventEntry);
    });
  });
}

/**
 * Get events for schedule split into per-day arrays
 *
 * @param {Schedule} schedule - Schedule to split into days
 * @returns {Array.<Array.<Event>>} - Each entry is an array of Events with the
 *                                    same day, sorted ascending.
 */
function byDay(schedule) {
  let events = schedule.events.slice();
  let result = [[]];

  sortEvents(events);

  let currentDay = events[0].day;

  events.forEach(function(e) {
    if (e.day != currentDay) {
      result.push([]);
      currentDay = e.day;
    }
    result[result.length - 1].push(e);
  });

  return result;
}

/**
 * Load settings from localStorage
 *
 * @param {Object} s - The window.localStorage object to load from
 * @returns {Settings}
 */
function loadSettings(s) {
  let result = {
    selectedCourseNumbers: [],
  };
  if (s.ttime3_selectedCourses) {
    result.selectedCourseNumbers = JSON.parse(s.ttime3_selectedCourses);
  }
  console.info('Loaded settings:', result);
  return result;
}

loadCatalog(catalogUrl).then(
  function(catalog) {
    console.log('Loaded catalog:', catalog);
    currentCatalog = catalog;
    writeCatalogSelector();
    loadSettings(window.localStorage).selectedCourseNumbers.forEach(function(
      id
    ) {
      addSelectedCourseByID(id);
    });
  },
  function(error) {
    console.error('Failed!', error);
  }
);
