// script.js

let config = {};
let profiles = {};

async function saveConfigData() {
  try {
    const response = await fetch('/save-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (response.ok) {
      console.log('config data updated successfully');
    } else {
      console.error('Error updating config data:', response.statusText);
    }
  } catch (error) {
    console.error('Error updating config data:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('configForm');
  const adminList = document.getElementById('adminList');
  const searchUser = document.getElementById('searchUser');
  const searchResults = document.getElementById('searchResults');

  await fetch('/config.json').then(res => res.json())
  .then((data) => {
    config = data;
  });
  await fetch('/profiles.json').then(res => res.json())
  .then((data) => {
    profiles = data;
  });

  await displayAdmins();

  async function displayAdmins() {
    adminList.innerHTML = '';
    console.log("config.admins: ", config.admins);
    config.admins.forEach(id => {

      const adminEl = adminTemplate.content.cloneNode(true);
      const adminInfoEl = adminEl.querySelector('.admin-info');

      profiles.users.forEach(profile => {
        if (profile.id === id) {
          adminInfoEl.innerHTML = `${profile.name} (${profile.id})`;
          adminEl.querySelector('.removeAdmin').addEventListener('click', () => deleteAdmin(id));
          adminList.appendChild(adminEl);
        }
      });
    });

      
  }

  function deleteAdmin(id){
    if (confirm('Are you sure you want to delete this user?')) {
      config.admins = config.admins.filter(adminId => adminId !== id);
      displayAdmins();
    }
  }

  function createRemoveAdminButton(id) {
    const button = document.createElement('button');
    button.textContent = '-';
    button.classList.add('removeAdmin');
    button.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this user?')) {
        config.admins = config.admins.filter(adminId => adminId !== id);
        displayAdmins();
      }
    });
    return button;
  }

  function displaySearchResults(users) {
    searchResults.style.display = 'block';
    searchResults.innerHTML = '';
    users.forEach(user => {
      const li = document.createElement('li');
      li.textContent = `${user.name} (${user.id})`;
      li.dataset.id = user.id;
      li.addEventListener('click', () => {
        const selectedItem = searchResults.querySelector('li.selected');
        if (selectedItem) {
          selectedItem.classList.remove('selected');
        }
        li.classList.add('selected');
        searchUser.value = li.textContent;
        searchResults.style.display = 'none';
      });
      searchResults.appendChild(li);
    });
  }

  function searchUsers(query) {
    return profiles.users.filter(user => user.name.toLowerCase().includes(query.toLowerCase()));
  }

  function addAdmin(id) {
    if (!config.admins.includes(id)) {
      config.admins.push(id);
      displayAdmins();
    }
  }

  form.devMode.checked = config.devMode;
  form.isMaster.checked = config.isMaster;
  form.instance_id.value = config.instance_id;
  form.chatrooms.checked = config.chatrooms;
  form.chatRoomCooldownsNormal.value = config.chatRoomCooldowns.normal;
  form.chatRoomCooldownsNoRespond.value = config.chatRoomCooldowns.noRespond;
  form.gpt4ReqLimit.value = config.gpt4ReqLimit
  form.gpt4ReqCooldown.value = config.gpt4ReqCooldown;

  displayAdmins();

  searchUser.addEventListener('input', () => {
    const query = searchUser.value.trim();
    if (query) {
      const results = searchUsers(query);
      displaySearchResults(results);
    } else {
      searchResults.style.display = 'none';
    }
  });

  document.getElementById('addAdmin').addEventListener('click', () => {
    const id = searchResults.querySelector('li.selected')?.dataset.id;
    console.log("id: ", id);
    if (id) {
      addAdmin(Number(id));
      searchUser.value = '';
      searchResults.style.display = 'none';
    }
  });
    

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    config.devMode = form.devMode.checked;
    config.isMaster = form.isMaster.checked;
    config.instance_id = Number(form.instance_id.value);
    config.chatrooms = form.chatrooms.checked;
    config.chatRoomCooldowns.normal = Number(form.chatRoomCooldownsNormal.value);
    config.chatRoomCooldowns.noRespond = Number(form.chatRoomCooldownsNoRespond.value);
    config.gpt4ReqLimit = Number(form.gpt4ReqLimit.value);
    config.gpt4ReqCooldown = Number(form.gpt4ReqCooldown.value);

    // Save the updated config.json here (e.g., send it to a server or save it locally)
    console.log(config);

    saveConfigData();
  });
});
  