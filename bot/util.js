const fs = require("fs");

const profilesPath = './bot/profiles.json';

const profiles = JSON.parse(fs.readFileSync(profilesPath));

module.exports = {
    getProfile,getProfileById,syncProfilesToFile
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