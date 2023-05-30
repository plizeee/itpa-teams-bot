//TODO sort courses by day and time

let coursesData = {
    courses: []
  };
  
  let editingCourseIndex = null;
  let editingSessionIndex = null;
  let editingSessionCourseIndex = null;
  
  async function saveCoursesData() {
    try {
      const response = await fetch('/save-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(coursesData)
      });
  
      if (response.ok) {
        console.log('Courses data updated successfully');
      } else {
        console.error('Error updating courses data:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating courses data:', error);
    }
  }
  
  
  document.addEventListener('DOMContentLoaded', () => {
    fetch('/courses.json')
    .then(response => response.json())
    .then(data => {
      console.log(data);
      coursesData = data;
      renderCourses(); // Call renderCourses after data is fetched
    })
    .catch(error => {
      console.log('Error reading file:', error);
    });
  
  
    const coursesList = document.getElementById('coursesList');
    const courseTemplate = document.getElementById('courseTemplate');
    const sessionTemplate = document.getElementById('sessionTemplate');
    const addCourseBtn = document.getElementById('addCourseBtn');
    const courseNameInput = document.getElementById('courseName');
    const courseCodeInput = document.getElementById('courseCode');
    const courseLinkInput = document.getElementById('courseLink');
    const courseForm = document.getElementById('courseForm');
    //const courseFormCancelBtn = document.getElementById('cancelBtn');
    const courseModal = document.getElementById('courseModal');
    const courseFormSubmitBtn = document.getElementById('courseFormSubmitBtn');
  
  
    const sessionModal = document.getElementById('sessionModal');
    const sessionForm = document.getElementById('sessionForm');
    const sessionFormSubmitBtn = document.getElementById('sessionFormSubmitBtn');
    //const sessionFormCancelBtn = document.getElementById('cancelBtn');
    const closeBtns = document.querySelectorAll('.close');
    const cancelBtns = document.querySelectorAll('.cancel');
  
    const addSessionBtn = document.createElement('button');
    addSessionBtn.classList.add('addSessionBtn');
    addSessionBtn.textContent = '+';

    function formatTime(time) {
      let strOutput = '';  

      //add am/pm
      if (time >= 1300) {
          strOutput +=  time - 1200 + ' pm';
      } else {
          strOutput += time + ' am';
      }

      //add : to the time
      strOutput = strOutput.slice(0, -5) + ':' + strOutput.slice(-5);

      return strOutput;
    }
  
    function renderCourses() {
      coursesList.innerHTML = '';

      coursesData.courses.forEach((course, courseIndex) => {
        // Create a new course element from the template
        const courseEl = courseTemplate.content.cloneNode(true);
        const courseInfoEl = courseEl.querySelector('.course-info');

        const courseDetailsEl = courseEl.querySelector('.course-details');
        courseDetailsEl.innerHTML = `<strong>${course.name} (${course.code})</strong><br>`;

        course.days.forEach((day, sessionIndex) => {
          const sessionEl = sessionTemplate.content.cloneNode(true);
          const sessionInfoEl = sessionEl.querySelector('.session-info');
          const deleteSessionBtn = sessionEl.querySelector('.deleteSessionBtn');
          const editSessionBtn = sessionEl.querySelector('.editSessionBtn');

          editSessionBtn.addEventListener('click', () => {
            editingSessionIndex = sessionIndex;
            editingSessionCourseIndex = courseIndex;
            editSession(courseIndex, sessionIndex);
          });

          course.isOnline[sessionIndex] ? sessionInfoEl.innerHTML = `<a href="${course.link}">${day} ${formatTime(course.startTimes[sessionIndex])} - ${formatTime(course.endTimes[sessionIndex])} (Online)</a>` :
          sessionInfoEl.textContent = `${day} ${formatTime(course.startTimes[sessionIndex])} - ${formatTime(course.endTimes[sessionIndex])} ${course.isOnline[sessionIndex] ? '(Online)' : '(In-person)'}`;

          deleteSessionBtn.addEventListener('click', () => deleteSession(courseIndex, sessionIndex));

          courseInfoEl.appendChild(sessionEl);
        });

        const sessionsContainer = document.createElement('div');
        sessionsContainer.appendChild(addSessionBtn.cloneNode(true));
        sessionsContainer.lastChild.addEventListener('click', () => {
          editingCourseIndex = courseIndex;
          editingSessionCourseIndex = courseIndex;
          showSessionForm();
        });
        courseInfoEl.appendChild(sessionsContainer);

        const editBtn = courseEl.querySelector('.editBtn');
        const deleteBtn = courseEl.querySelector('.deleteBtn');

        editBtn.addEventListener('click', () => editCourse(courseIndex));
        deleteBtn.addEventListener('click', () => deleteCourse(courseIndex));

        coursesList.appendChild(courseEl);
      });
    }
  
    function editSession(courseIndex, sessionIndex) {
      console.log('Editing session', sessionIndex, 'of course', courseIndex);
      const course = coursesData.courses[courseIndex];
    
      const day = course.days[sessionIndex];
      const startTime = course.startTimes[sessionIndex];
      const endTime = course.endTimes[sessionIndex];
      const isOnline = course.isOnline[sessionIndex];
    
      document.getElementById('sessionDay').value = day;
      document.getElementById('sessionStartTime').value = startTime.toString().replace(/(\d{2})(\d{2})/, '$1:$2');
      document.getElementById('sessionEndTime').value = endTime.toString().replace(/(\d{2})(\d{2})/, '$1:$2');
      document.getElementById('sessionIsOnline').checked = isOnline;
    
      showSessionForm();
    }
  
    function submitSessionForm(event) {
      event.preventDefault();
    
      const newDay = document.getElementById('sessionDay').value;
      const newStartTime = parseInt(document.getElementById('sessionStartTime').value.replace(':', ''));
      const newEndTime = parseInt(document.getElementById('sessionEndTime').value.replace(':', ''));
      const isOnline = document.getElementById('sessionIsOnline').checked;
    
      if (editingSessionCourseIndex === null && editingSessionIndex === null) {
        alert('Please select a course before adding a session.');
        return;
      }
    
      const course = coursesData.courses[editingSessionCourseIndex];
    
      if (editingSessionIndex === null) {
        course.days.push(newDay);
        course.startTimes.push(newStartTime);
        course.endTimes.push(newEndTime);
        course.isOnline.push(isOnline);
      } else {
        course.days[editingSessionIndex] = newDay;
        course.startTimes[editingSessionIndex] = newStartTime;
        course.endTimes[editingSessionIndex] = newEndTime;
        course.isOnline[editingSessionIndex] = isOnline;
      }
    
      editingSessionIndex = null;
      editingSessionCourseIndex = null;
    
      renderCourses();
      saveCoursesData();
      //hideSessionForm();
      closeModal();
    }
    
    
  
    function showCourseForm() {
      courseModal.style.display = 'block';
    }
  
    function hideCourseForm() {
      courseModal.style.display = 'none';
    }

    function showSessionForm() {
      sessionModal.style.display = 'block';
      //editingSessionIndex = null;
    }
  
    function hideSessionForm() {
      sessionModal.style.display = 'none';
    }
  
    function closeModal(){
      courseModal.style.display = 'none';
      sessionModal.style.display = 'none';
    }

    function submitCourseForm(event) {
      event.preventDefault();
  
      const courseName = courseNameInput.value;
      const courseCode = courseCodeInput.value;
      const courseLink = courseLinkInput.value;
  
      if (editingCourseIndex === null) {
        const newCourse = {
          name: courseName,
          code: courseCode,
          link: courseLink,
          days: [],
          startTimes: [],
          endTimes: [],
          isOnline: []
        };
  
        coursesData.courses.push(newCourse);
        editingCourseIndex = coursesData.courses.length - 1;
      } 
      else {
        const course = coursesData.courses[editingCourseIndex];
        course.name = courseName;
        course.code = courseCode;
        course.link = courseLink;
      }
      renderCourses();
      saveCoursesData();
      //hideCourseForm();
      closeModal();
    }
  
    function addCourse(event) {
      event.preventDefault();
  
      const courseName = document.getElementById('courseName').value;
      if (!courseName) return;
  
      const courseCode = document.getElementById('courseCode').value;
      if (!courseCode) return;
  
      const courseLink = document.getElementById('courseLink').value;
  
      const newCourse = {
        name: courseName,
        code: courseCode,
        link: courseLink,
        days: [],
        startTimes: [],
        endTimes: [],
        isOnline: []
      };
  
      coursesData.courses.push(newCourse);
      editCourse(coursesData.courses.length - 1);
  
      // Clear the input fields
      document.getElementById('courseName').value = '';
      document.getElementById('courseCode').value = '';
      document.getElementById('courseLink').value = '';
  
      renderCourses();
    }
    
  
  
    function editCourse(courseIndex) {
      const course = coursesData.courses[courseIndex];
    
      courseNameInput.value = course.name;
      courseCodeInput.value = course.code;
      courseLinkInput.value = course.link;
    
      editingCourseIndex = courseIndex;
      showCourseForm();
    }
    
    
  
    function deleteCourse(courseIndex) {
      if (confirm('Are you sure you want to delete this course?')) {
          coursesData.courses.splice(courseIndex, 1);
          renderCourses();
          saveCoursesData();
      }
    }
  
    function addSession(courseIndex) {
        const course = coursesData.courses[courseIndex];
  
        course.days.push(newDay);
        course.startTimes.push(newStartTime);
        course.endTimes.push(newEndTime);
        course.isOnline.push(isOnline);
  
        renderCourses();
    }
  
    function deleteSession(courseIndex, sessionIndex) {
      const course = coursesData.courses[courseIndex];

      if (confirm('Are you sure you want to delete this session?')) {
        course.days.splice(sessionIndex, 1);
        course.startTimes.splice(sessionIndex, 1);
        course.endTimes.splice(sessionIndex, 1);
        course.isOnline.splice(sessionIndex, 1);

        renderCourses();
        saveCoursesData();
      }
    }
  
    addCourseBtn.addEventListener('click', (event) => {
      event.preventDefault();
      editingCourseIndex = null;
      courseNameInput.value = '';
      courseCodeInput.value = '';
      courseLinkInput.value = '';
      showCourseForm();
    });
    
    courseForm.addEventListener('submit', submitCourseForm);
  
    //courseFormCancelBtn.addEventListener('click', closeModal);
  
    cancelBtns.forEach(btn => btn.addEventListener('click', closeModal));

    //closeBtn.addEventListener('click', closeModal);
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
  
    courseFormSubmitBtn.addEventListener('click', submitCourseForm);
  
    sessionForm.addEventListener('submit', submitSessionForm);
    //sessionFormCancelBtn.addEventListener('click', closeModal);
  
    renderCourses();
  });
  