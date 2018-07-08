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
 * @property {number[]} selectedCourses
 * @property {string} catalogUrl
 */

const defaultCatalogUrl =
  'https://storage.googleapis.com/repy-176217.appspot.com/latest.json';

/**
 * Set the given catalog URL and save settings. For use from HTML.
 *
 * @param {string} url - URL to set
 */
function setCatalogUrl(url) {
  /* exported setCatalogUrl */
  document.getElementById('catalog-url').value = url;
  saveSettings();
}

let selectedCourses = new Set();

/**
 * Catalog of all courses
 * @type {Catalog}
 */
let currentCatalog = null;

/**
 * Creates an element with the given HTML.
 *
 * TODO(lutzky): There must be some builtin that does this...
 *
 * @param {string} tagName - Tag to build
 * @param {string} innerHTML - HTML to fill tag with
 *
 * @returns {HTMLElement}
 */
function elementWithHTML(tagName, innerHTML) {
  let elem = document.createElement(tagName);
  elem.innerHTML = innerHTML;
  return elem;
}

/**
 * Return an HTML description for a course
 *
 * @param {Course} course - Course to describe
 *
 * @returns {HTMLSpanElement}
 */
function htmlDescribeCourse(course) {
  let result = document.createElement('span');
  console.info('Rendering description of course:', course);
  let ul = document.createElement('ul');
  ul.appendChild(
    elementWithHTML('li', `<b>Full name</b> ${course.id} ${course.name}`)
  );
  ul.appendChild(
    elementWithHTML('li', `<b>Academic points:</b> ${course.academicPoints}`)
  );
  ul.appendChild(
    elementWithHTML(
      'li',
      `<b>Lecturer in charge:</b> ${rtlSpan(
        course.lecturerInCharge || '[unknown]'
      )}`
    )
  );
  ul.appendChild(elementWithHTML('li', '<b>Test dates:</b>'));
  let testDates = document.createElement('ul');
  if (course.testDates) {
    course.testDates.forEach(function(d) {
      testDates.appendChild(elementWithHTML('li', formatDate(d)));
    });
  } else {
    testDates.appendChild(elementWithHTML('li', '[unknown]'));
  }
  ul.appendChild(testDates);

  ul.appendChild(elementWithHTML('li', '<b>Groups:</b>'));
  let groups = document.createElement('ul');
  if (course.groups) {
    course.groups.forEach(function(g) {
      groups.appendChild(
        elementWithHTML('li', `<b>Group ${g.id} (type: ${g.type})`)
      );
      let events = document.createElement('ul');
      if (g.events) {
        g.events.forEach(function(e) {
          events.appendChild(
            elementWithHTML(
              'li',
              `${dayNames[e.day]}, ${minutesToTime(
                e.startMinute
              )}-${minutesToTime(e.endMinute)} at ${e.location || '[unknown]'}`
            )
          );
        });
      } else {
        events.appendChild(elementWithHTML('li', '[unknown]'));
      }
      groups.appendChild(events);
    });
  } else {
    groups.appendChild(elementWithHTML('li', '[unknown]'));
  }
  ul.appendChild(groups);

  result.appendChild(ul);
  return result;
}

const rightArrow = '&#9656;';
const downArrow = '&#9662;';

/**
 * Wrap s with a right-to-left span
 *
 * @param {string} s - String to wrap
 * @returns {string}
 */
function rtlSpan(s) {
  return `<span dir="rtl">${s}</span>`;
}

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
  infoLink.className = 'expando';
  infoLink.href = '#/';
  span.innerHTML = ` ${course.id} ${rtlSpan(course.name)} `;
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

let courseAddButtons = new Map();
let courseAddLabels = new Map();

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
      courseAddButtons.set(course.id, btn);
      let label = courseLabel(course);
      courseAddLabels.set(course.id, label);
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
  settings.selectedCourses = Array.from(selectedCourses).map(c => c.id);
  settings.catalogUrl = document.getElementById('catalog-url').value;
  settings.filters = Array.from(document.querySelectorAll('[id^="filter."]'))
    .filter(node => node.checked)
    .map(node => node.id.split('.')[1]);

  window.localStorage.ttime3_settings = JSON.stringify(settings);

  console.info('Saved settings:', settings);
}

/**
 * Mark course as selected.
 *
 * @param {Course} course - Course to select
 */
function addSelectedCourse(course) {
  console.info('Selected', course);
  selectedCourses.add(course);
  courseAddButtons.get(course.id).disabled = true;
  courseAddLabels.get(course.id).classList.add('disabled-course-label');
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
  courseAddButtons.get(course.id).disabled = false;
  courseAddLabels.get(course.id).classList.remove('disabled-course-label');
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
  w.postMessage({ courses: selectedCourses, filters: settings.filters });
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
      eventEntry.innerHTML = `${startTime}-${endTime} ${rtlSpan(
        e.group.course.name
      )} at ${rtlSpan(e.location || '[unknown]')}`;
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
  let result = {};
  if (s.ttime3_settings) {
    result = JSON.parse(s.ttime3_settings);
  }

  if (!result.catalogUrl) {
    result.catalogUrl = defaultCatalogUrl;
  }
  if (!result.selectedCourses) {
    result.selectedCourses = [];
  }
  if (!result.filters) {
    result.filters = ['noCollisions'];
  }

  console.info('Loaded settings:', result);

  document.getElementById('catalog-url').value = result.catalogUrl;

  result.filters.forEach(function(filter) {
    document.getElementById('filter.' + filter).checked = true;
  });

  return result;
}

/**
 * Show or hide the settings div. Updates shape of toggle button appropriately.
 *
 * @param {bool} show - Whether or not the settings div should be visible
 */
function showSettingsDiv(show) {
  let toggleLink = document.getElementById('toggle-settings-div');
  let settingsDiv = document.getElementById('settings-div');

  toggleLink.innerHTML = show ? downArrow : rightArrow;
  settingsDiv.hidden = !show;
  toggleLink.onclick = () => showSettingsDiv(!show);
}

showSettingsDiv(false);

let settings = loadSettings(window.localStorage);

loadCatalog(settings.catalogUrl).then(
  function(catalog) {
    console.log('Loaded catalog:', catalog);
    currentCatalog = catalog;
    writeCatalogSelector();
    settings.selectedCourses.forEach(function(id) {
      try {
        addSelectedCourseByID(id);
      } catch (error) {
        console.error(`Failed to add course ${id}:`, error);
      }
    });
  },
  function(error) {
    console.error('Failed!', error);
  }
);
