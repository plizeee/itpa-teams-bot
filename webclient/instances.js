let instanceData = {
    instances: []
};

let instanceList;
let instanceItemTemplate;

document.addEventListener("DOMContentLoaded", async () => {
    instanceList = document.getElementById('instance-list');
    instanceItemTemplate = document.getElementById('instance-template');

    await fetchData();
});

function renderInstanceList() {
    instanceList.innerHTML = '';

    instanceData.instances.forEach((instance, index) => {
        const instanceItem = instanceItemTemplate.content.cloneNode(true);

        instanceItem.querySelector('.instance-id-value').innerHTML = instance.instance_id;
        let instanceTimeElement = instanceItem.querySelector('.instance-time-value');
        instanceItem.querySelector('.instance-pid-value').innerHTML = instance.pid;

        setInterval(() => {
            instanceTimeElement.innerHTML = timeSince(instance.date);
        }, 1000);

        const killButton = instanceItem.querySelector('.killInstanceBtn');
        killButton.addEventListener('click', () => killInstance(instance.instance_id, instance.pid));

        instanceList.appendChild(instanceItem);
    });
}

async function fetchData() {
    fetch(`instanceData.json?_=${new Date().getTime()}`)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        instanceData = data;
        renderInstanceList();
    })
    .catch(error => {
      console.log('Error reading file:', error);
    });
}

function timeSince(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    let secondsPast = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let hours = Math.floor(secondsPast / 3600);
    secondsPast = secondsPast % 3600;

    let minutes = Math.floor(secondsPast / 60);
    secondsPast = secondsPast % 60;

    // Add leading zeroes if necessary
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    secondsPast = secondsPast < 10 ? '0' + secondsPast : secondsPast;

    return `${hours}:${minutes}:${secondsPast}`;
}

async function killInstance(instance_id, pid) {
    try {
        const response = await fetch(`kill-instance`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instance_id: instance_id, pid: pid }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for a bit to ensure the instance data has updated on the server
        await fetchData();
    } catch (error) {
        console.log('Error killing instance:', error);
    }
}