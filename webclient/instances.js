let instanceData = {
    instances: []
};

let instanceList;
let instanceItemTemplate;

document.addEventListener("DOMContentLoaded", () => {
    instanceList = document.getElementById('instance-list');
    instanceItemTemplate = document.getElementById('instance-template');

    fetchData();
});

function renderInstanceList() {
    instanceList.innerHTML = '';

    instanceData.instances.forEach((instance, index) => {
        const instanceItem = instanceItemTemplate.content.cloneNode(true);

        instanceItem.querySelector('.instance-id-value').innerHTML = instance.instanceID;
        let instanceTimeElement = instanceItem.querySelector('.instance-time-value');
        instanceItem.querySelector('.instance-pid-value').innerHTML = instance.pid;

        setInterval(() => {
            instanceTimeElement.innerHTML = timeSince(instance.date);
        }, 1000);

        const killButton = instanceItem.querySelector('.killInstanceBtn');
        killButton.addEventListener('click', () => killInstance(instance.instanceID, instance.pid));

        instanceList.appendChild(instanceItem);
    });
}

async function fetchData() {
    try {
        const response = await fetch(`/instanceData.json?_=${new Date().getTime()}`);
        const data = await response.json();

        console.log(data);
        instanceData.instances = data.instances;
        renderInstanceList();
    } catch (error) {
        console.log('Error reading file:', error);
    }
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

async function killInstance(instanceID, pid) {
    try {
        const response = await fetch(`/kill-instance`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instanceID: instanceID, pid: pid }),
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
