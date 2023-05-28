

let isEditMode = false;
let activeCommandIndex = null;
let promptCommands = {
    commands: []
};

async function savePrompts() {
    try {
      const response = await fetch('/save-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promptCommands)
      });
  
      if (response.ok) {
        console.log('Prompts updated successfully');
      } else {
        console.error('Error updating prompt data:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating prompt data:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    fetch('/promptCommands.json')
    .then(response => response.json())
    .then(data => {
      console.log(data);
      promptCommands = data;
      renderCommandList();
    })
    .catch(error => {
      console.log('Error reading file:', error);
    });

    const addCommandBtn = document.getElementById('addCourseBtn');
    const commandList = document.getElementById('command-list');
    const commandItemTemplate = document.getElementById('command-item-template');
    const commandModal = document.getElementById('command-modal');
    //const closeBtn = document.getElementById('closeBtn');
    const closeBtn = document.querySelector('.close');
    const commandForm = document.getElementById('command-form');
    const saveCommandBtn = document.getElementById('save-command-btn');
    const deleteCommandBtn = document.getElementById('delete-command-btn');

    const promptNameInput = document.getElementById('prompt-command-input');
    const promptCommandInput = document.getElementById('prompt-name-input');
    const promptDescriptionInput = document.getElementById('prompt-description-input');
    const promptPermissionInput = document.getElementById('prompt-permission-level-input');
    const promptModelInput = document.getElementById('prompt-model-input');
    const commandPromptInput = document.getElementById('command-prompt-input');

addCommandBtn.addEventListener('click', () => {
    isEditMode = false;
    openModal();
});

closeBtn.addEventListener('click', () => {
    closeModal();
});

// Add an event listener to the command form to prevent its default submission behavior
commandForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCommand();
});

// Update the openModal function
function openModal() {
    commandModal.style.display = 'block';
    commandForm.reset();
    commandModal.classList.remove('hidden');

    // Show the delete button only in edit mode
    if (isEditMode) {
        deleteCommandBtn.classList.remove('hidden');
        deleteCommandBtn.setAttribute('data-index', activeCommandIndex);
    } else {
        deleteCommandBtn.classList.add('hidden');
    }
}

function closeModal() {
    //commandModal.classList.add('hidden');
    commandModal.style.display = 'none';
}

// Update the deleteCommandBtn event listener
deleteCommandBtn.addEventListener('click', function() {
    const confirmed = confirm('Are you sure you want to delete this command?');
    if (confirmed) {
        deleteCommand();
    }
});


function deleteCommand() {
    const index = parseInt(deleteCommandBtn.getAttribute('data-index'), 10);
    console.log("index: " + index);
    if (index >= 0 && index < promptCommands.commands.length) {
        promptCommands.commands.splice(index, 1);
    }
    closeModal();
    renderCommandList();
    savePrompts();
    commandForm.reset(); 
}


function saveCommand() {
    const promptName = document.getElementById('prompt-name-input').value;
    const promptCommand = document.getElementById('prompt-command-input').value;
    const promptDescription = document.getElementById('prompt-description-input').value;
    const promptPermission = document.getElementById('prompt-permission-level-input').value;
    const promptModel = document.getElementById('prompt-model-input').value;
    const commandPrompt = document.getElementById('command-prompt-input').value;

    if (isEditMode) {
        updateCommand(activeCommandIndex, { name: promptName, command: promptCommand, description: promptDescription, permission: promptPermission, model: promptModel, prompt: commandPrompt });
    } else {
        //addCommand({ title: commandTitle, name: commandName, description: commandDescription, permissionLevel: commandPermissionLevel, commandModel: commandModel, prompt: commandPrompt });
        addCommand({ name: promptName, command: promptCommand, description: promptDescription, permission: promptPermission, model: promptModel, prompt: commandPrompt });
    }

    renderCommandList();
    savePrompts();
    closeModal();
    commandForm.reset(); 
}

function addCommand(command) {
    promptCommands.commands.push(command);
}

function updateCommand(index, command) {
    promptCommands.commands[index] = command;
}

function renderCommandList() {
    commandList.innerHTML = '';

    promptCommands.commands.forEach((command, index) => {
        const commandItem = commandItemTemplate.content.cloneNode(true);
        
        // Update the text content for each field
        commandItem.querySelector('.prompt-name-value').innerHTML = command.name;
        commandItem.querySelector('.prompt-command-value').innerHTML = command.command;
        commandItem.querySelector('.prompt-description-value').innerHTML = command.description;
        commandItem.querySelector('.prompt-permission-level-value').innerHTML = command.permission;
        commandItem.querySelector('.prompt-model-value').innerHTML = command.model;
        commandItem.querySelector('.command-prompt-value').innerHTML = command.prompt;


        const editCommandBtn = commandItem.querySelector('.editBtn');
        
        editCommandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isEditMode = true;
            activeCommandIndex = index;
            openModal();
            
            // Prefill the form with the current command values
            promptNameInput.value = command.name;
            promptCommandInput.value = command.command;
            promptDescriptionInput.value = command.description;
            promptPermissionInput.value = command.permission;
            promptModelInput.value = command.model;
            commandPromptInput.value = command.prompt;
        });

        commandList.appendChild(commandItem);
    });
}

renderCommandList();
});