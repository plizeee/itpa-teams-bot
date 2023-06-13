const fs = require("fs");
const { exec } = require('child_process');

const profilesPath = './bot/profiles.json';
const gptSecretsPath = './bot/gptSecrets.json';
const instanceDataPath = './bot/instanceData.json';

const profiles = JSON.parse(fs.readFileSync(profilesPath));
const gptSecrets = JSON.parse(fs.readFileSync(gptSecretsPath));
let instanceData = JSON.parse(fs.readFileSync(instanceDataPath));

module.exports = {
    getProfile,getProfileById,syncProfilesToFile,syncLeaderboardToFile,handleExit
}

function getProfile(msg){
    for(let profile of profiles["users"]){
        if(profile.id == msg.author.id){
            return profile;
        }
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
function syncProfilesToFile(isMaster){
    if(isMaster){ //I only want to write to file in master branch
        fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, "\t"), function (err) {
            if (err)console.log(err);
            else console.log("JSON saved to " + profilesPath);
        });
    }
    else console.log("Dev Mode is currently active. Profile not synced to file");
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

function handleExit(instanceID){
    instanceData = JSON.parse(fs.readFileSync(instanceDataPath));
    let instance = instanceData.instances.find(instance => instance.instanceID === instanceID);
    if (instance) {
        let pid = instance.pid;
        if(!pid){
            console.log("Shutting down instance " + instanceID);
            instanceData.instances.splice(instanceData.instances.indexOf(instanceID), 1); //remove instance from list
            fs.writeFileSync(instanceDataPath, JSON.stringify(instanceData, null, "\t")); //write to file
            process.exit(0);
        }
        else{
            console.log(instanceData.instances);
            exec(`kill ${pid}`, (error, stdout, stderr) => {
                if (error) {
                  console.error(`Error while trying to kill process: ${error.message}`);
                  return;
                }
              
                let instanceIndex = instanceData.instances.findIndex(instance => instance.instanceID === instanceID);
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