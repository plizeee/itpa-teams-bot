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
    config = await fetch('/config.json').then(res => res.json());
    profiles = await fetch('/profiles.json').then(res => res.json());
    const form = document.getElementById('configForm');
    const adminList = document.getElementById('adminList');
    const searchUser = document.getElementById('searchUser');
    const searchResults = document.getElementById('searchResults');
  
    function displayAdmins() {
        adminList.innerHTML = '';
        config.admins.forEach(id => {
          const user = profiles.users.find(u => u.id === id);
          if (user) {
            const li = document.createElement('li');
            const name = document.createElement('span');
            name.textContent = `${user.name} (${user.id})`;
            li.appendChild(name);
            li.appendChild(createRemoveAdminButton(id));
            adminList.appendChild(li);
          }
        });
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
    form.instanceId.value = config.instanceId;
    form.chatrooms.checked = config.chatrooms;
    form.chatRoomCooldownsNormal.value = config.chatRoomCooldowns.normal;
    form.chatRoomCooldownsNoRespond.value = config.chatRoomCooldowns.noRespond;
  
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
      config.instanceId = Number(form.instanceId.value);
      config.chatrooms = form.chatrooms.checked;
      config.chatRoomCooldowns.normal = Number(form.chatRoomCooldownsNormal.value);
      config.chatRoomCooldowns.noRespond = Number(form.chatRoomCooldownsNoRespond.value);
  
      // Save the updated config.json here (e.g., send it to a server or save it locally)
      console.log(config);

      saveConfigData();
    });
  });
  