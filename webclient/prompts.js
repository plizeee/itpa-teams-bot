const addCommandBtn = document.getElementById('add-command-btn');
const commandList = document.getElementById('command-list');
const commandItemTemplate = document.getElementById('command-item-template');
const commandModal = document.getElementById('command-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const commandForm = document.getElementById('command-form');
const saveCommandBtn = document.getElementById('save-command-btn');
const deleteCommandBtn = document.getElementById('delete-command-btn');

let isEditMode = false;
let activeCommandIndex = null;
let commands = [];

addCommandBtn.addEventListener('click', () => {
    isEditMode = false;
    openModal();
});

closeModalBtn.addEventListener('click', () => {
    closeModal();
});

// Add an event listener to the command form to prevent its default submission behavior
commandForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCommand();
});

// Update the openModal function
function openModal() {
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
    commandModal.classList.add('hidden');
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
    if (index >= 0 && index < commands.length) {
        commands.splice(index, 1);
    }
    closeModal();
    renderCommandList();
    commandForm.reset(); 
}


function saveCommand() {
    const commandTitle = document.getElementById('command-title-input').value;
    const commandName = document.getElementById('command-name-input').value;
    const commandDescription = document.getElementById('command-description-input').value;
    const commandPermissionLevel = document.getElementById('command-permission-level-input').value;
    const commandPrompt = document.getElementById('command-prompt-input').value;

    if (isEditMode) {
        updateCommand(activeCommandIndex, { title: commandTitle, name: commandName, description: commandDescription, permissionLevel: commandPermissionLevel, prompt: commandPrompt });
    } else {
        addCommand({ title: commandTitle, name: commandName, description: commandDescription, permissionLevel: commandPermissionLevel, prompt: commandPrompt });
    }

    renderCommandList();
    closeModal();
    commandForm.reset(); 
}

function addCommand(command) {
    commands.push(command);
}

function updateCommand(index, command) {
    commands[index] = command;
}

function renderCommandList() {
    commandList.innerHTML = '';

    commands.forEach((command, index) => {
        const commandItem = commandItemTemplate.content.cloneNode(true);
        
        // Update the text content for each field
        commandItem.querySelector('.command-title-value').textContent = command.title;
        commandItem.querySelector('.command-name-value').textContent = command.name;
        commandItem.querySelector('.command-description-value').textContent = command.description;
        commandItem.querySelector('.command-permission-level-value').textContent = command.permissionLevel;
        commandItem.querySelector('.command-prompt-value').textContent = command.prompt;


        const editCommandBtn = commandItem.querySelector('.edit-command-btn');
        
        editCommandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isEditMode = true;
            activeCommandIndex = index;
            openModal();
            
            // Prefill the form with the current command values
            document.getElementById('command-title-input').value = command.title;
            document.getElementById('command-name-input').value = command.name;
            document.getElementById('command-description-input').value = command.description;
            document.getElementById('command-permission-level-input').value = command.permissionLevel;
            document.getElementById('command-prompt-input').value = command.prompt;
        });

        commandList.appendChild(commandItem);
    });
}

renderCommandList();
