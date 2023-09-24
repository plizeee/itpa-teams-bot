const fs = require("fs");
const { exec } = require('child_process');

const profilesPath = './bot/profiles.json';
const gptSecretsPath = './bot/gptSecrets.json';
const instanceDataPath = './bot/instanceData.json';
const coursesPath = './bot/courses.json';
const configPath = './bot/config.json';

const profiles = JSON.parse(fs.readFileSync(profilesPath));
const gptSecrets = JSON.parse(fs.readFileSync(gptSecretsPath));
let instanceData = JSON.parse(fs.readFileSync(instanceDataPath));
const courses = JSON.parse(fs.readFileSync(coursesPath));
const config = JSON.parse(fs.readFileSync(configPath));

const master_instance_id = config.master_instance_id || 0;
// const isMaster = config.isMaster; //only check this on launch
const isMaster = config.instance_id == master_instance_id; //only check this on launch


module.exports = {
    getProfile,
    getProfileById,
    syncProfilesToFile,
    syncLeaderboardToFile,
    handleExit,
    getProcessStatus,
    isProcessStored,
    filterProfiles,
    filterCourses,
}

function getProfile(msg){
    for(let profile of profiles["users"]){
        if(profile.id == msg.author.id){
            return profile;
        }
    }

    if(isNewProfile(msg.author.id)){
        createProfile(msg);
        return getProfile(msg);
    }

    return null;
}

function getProfileById(id){
    for(let profile of profiles["users"]){
        if(profile.id == id){
            return profile;
        }
    }
    
    return null;
}

function isNewProfile(id){
    for(let i = 0; i < profiles.users.length; i++){
        if(id == profiles.users[i].id){
            return false;
        }
    }
    return true;
}

function createProfile(msg){
    //create a new profile
    profiles.users.push({
        "id": parseInt(msg.author.id),
        "name": msg.author.username,
        "rep": 0,
        "teams": [{
            "linkMessages": [],
            "lateMessages": [],
            "earlyMessages": []
        }],
        "timestamps": [],
        "instance_id": 0,
        "gpt4Timestamps": []
    });

    syncProfilesToFile(isMaster);
}

function getProfileByName(name){
    for(let profile of profiles["users"]){
        if(profile.name == name){
            return profile;
        }
    }
    return null;
}
//should return a list array
function filterProfiles(names=[], ids=[], maxrep=null, minrep=null){
    return profiles.users.filter(profile =>{
        let result = ids.length?ids.includes(profile.id):true; //
        result &&= names.length?names.includes(profile.name.toLowerCase()):true; //
        result &&= maxrep?profile.rep <= maxrep:true;
        result &&= minrep?profile.rep >= minrep:true;
        return result;
    })
}

function filterCourses(names=[], code=[], days=[], startTimes=[], endTimes=[], isOnline=false, link=""){
    return courses.courses.filter(course =>{
        let result = names.length ? names.includes(course.name.toLowerCase()) : true;
        result &&= code.length ? code.includes(course.code.toLowerCase()) : true;
        result &&= days.length ? days.some(day => course.days.map(d => d.toLowerCase()).includes(day.toLowerCase())) : true;
        result &&= startTimes.length ? startTimes.includes(course.startTimes) : true;
        result &&= endTimes.length ? endTimes.includes(course.endTimes) : true;
        result &&= isOnline ? course.isOnline === isOnline : true;
        result &&= link ? course.link === link : true;
        return result;
    })
}


function syncProfilesToFile(){
    if(isMaster){ //I only want to write to file in master branch
        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, "\t"));
        console.log("JSON saved to " + profilesPath);
        return true;
    }
    else console.log("Dev Mode is currently active. Profile not synced to file");
    return false;
}

function syncLeaderboardToFile(isMaster, val = gptSecrets){
    if(isMaster){ //I only want to write to file in master branch
        fs.writeFileSync(gptSecretsPath, JSON.stringify(val, null, "\t"), function (err) {
            if (err)console.log(err);
            else console.log("JSON saved to " + gptSecretsPath);
        });
    }
    else console.log("Dev Mode is currently active. Leaderboard not synced to file");
}

function handleExit(instance_id){
    console.log("Handling exit...");
    instanceData = JSON.parse(fs.readFileSync(instanceDataPath));
    let instance = instanceData.instances.find(instance => instance.instance_id === instance_id);
    if (instance) {
        let pid = instance.pid;
        if(!pid){
            let instanceIndex = instanceData.instances.findIndex(instance => instance.instance_id === instance_id);
            if (instanceIndex !== -1) {
                // Remove instance from list
                instanceData.instances.splice(instanceIndex, 1);
            }
    
            fs.writeFileSync(instanceDataPath, JSON.stringify(instanceData, null, "\t")); //
            process.exit(0);
        }
        else{
            console.log(instanceData.instances);
            exec(`kill ${pid}`, (error, stdout, stderr) => {
                if (error) {
                  console.error(`Error while trying to kill process: ${error.message}`);
                  process.exit(0);
                  //return;
                }
              
                let instanceIndex = instanceData.instances.findIndex(instance => instance.instance_id === instance_id);
                if (instanceIndex !== -1) {
                    // Remove instance from list
                    instanceData.instances.splice(instanceIndex, 1);
                }
                
    
                fs.writeFileSync(instanceDataPath, JSON.stringify(instanceData, null, "\t")); //
                console.log(`Process with PID ${pid} has been terminated.`);
            });
        }
    }
}

function getProcessStatus(pid) {
    return new Promise((resolve, reject) => {
        //const command = process.platform === 'win32' ? `tasklist /FI "PID eq ${pid}"` : `ps -p ${pid}`;

        if(isProcessStored(pid)){
            const command = `ps -p ${pid}`;
            exec(command, (error, stdout, stderr) => {
            if (error) {
                resolve(false);
                return;
            }

            console.log(stdout);
            resolve(stdout.toLowerCase().includes(pid.toString()));
            });
        }
        else{
            resolve(false);
        }
    });
}

function isProcessStored(pid){
    instanceData = JSON.parse(fs.readFileSync(instanceDataPath));
    let instance = instanceData.instances.find(instance => instance.pid === pid);
    console.log("isProcessStored returned: ", instance);
    return instance ? true : false;
}