const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle} = require('discord.js');
const SharedFunctions = require("./util.js");

module.exports = {
    checkUserCommand: (msg) =>{
        console.log("checking user commands")
        let message = msg.content
        let firstSpace = message.indexOf(" ");
        let command = message.slice(0,firstSpace==-1?undefined:firstSpace).toLowerCase();
        console.log(command);
        let found = true;
        switch(command){
            case "!notes":
                console.log("calling notes")    
                notesCommand(msg);
                break;
            default:
                found = false;
                break;
        }
        return found;
        
    }
}

async function notesCommand(msg) {
    let profile = SharedFunctions.getProfile(msg);
    let options = [];
    if(profile.editableNote){ options.push({ label: 'Yes', value: 'Yes', default:true},{ label: 'No', value: 'No'});}
    else{options.push({ label: 'Yes', value: 'Yes'},{ label: 'No', value: 'No', default:true});}
    const select = new StringSelectMenuBuilder(
        {
            custom_id: 'Note Opt-In/Out Select',
            placeholder: 'No',
            max_values: 1,
            options: options
        }
    );
    const EditButton = new ButtonBuilder({	custom_id: 'Edit Note Button', style: ButtonStyle.Primary, label: 'Edit Notes'})
    const Selectrow = new ActionRowBuilder().addComponents(select);
    const buttonRow = new ActionRowBuilder().addComponents(EditButton);

    let response = await msg.reply({content:"Let Terry edit your Note?:",components:[Selectrow,buttonRow]})

    const collectorFilter = i => i.user.id === msg.author.id;

    const collector = response.createMessageComponentCollector({ filter:collectorFilter, time: 3_600_000 });
    
    collector.on("collect", async i =>{
        if(i.isStringSelectMenu() && i.customId == "Note Opt-In/Out Select"){
            const selection = i.values[0];
            if(selection == 'Yes'){
                profile.editableNote = true;
                const success = SharedFunctions.syncProfilesToFile(true);
                if(success)i.reply({content:"choice saved",ephemeral:true});
            }
            else if(selection == 'No'){
                profile.editableNote = false;
                const success = SharedFunctions.syncProfilesToFile(true);
                if(success)i.reply({content:"choice saved",ephemeral:true});
            }
        }else if(i.isButton() && i.customId == "Edit Note Button"){
            let profile = SharedFunctions.getProfile(msg)
            const modal = new ModalBuilder()
			.setCustomId('NoteEditModal')
			.setTitle('Edit Your Note');
            const noteInput = new TextInputBuilder()
			.setCustomId('NoteInput')
			.setLabel("Edit your personal note for terry")
			.setStyle(TextInputStyle.Paragraph)
            .setMaxLength(500)
            .setPlaceholder('Enter some thing you wish terry would know or some intrsuctions for him!')
            .setRequired(true);
            if(profile.note) noteInput.setValue(profile.note);
            modal.addComponents(new ActionRowBuilder().addComponents(noteInput));
            i.showModal(modal);
            const filter = (interaction) => interaction.customId === 'NoteEditModal';
            const submission = await i.awaitModalSubmit({ filter, time: 3_600_000 });
            profile.note = submission.fields.getTextInputValue('NoteInput');
            const success = SharedFunctions.syncProfilesToFile(true);
            if(success)submission.reply({content:"Note Saved",ephemeral:true});
            
        }
    })

}