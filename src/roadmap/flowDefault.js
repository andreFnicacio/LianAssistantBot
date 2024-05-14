const redis = require("../util/redis/redis_config");
const whatsappModel = require("../shared/whatsappmodels");
const sendTrigger = require("../util/api/sendTrigger");
const closeSession = require("../util/api/closeSession"); 
const deleteClient = require("../util/api/deleteClient"); 
const sendDocumentModel = require("../util/api/sendDocumentExample");
const updateClient = require("../util/api/updateClient");

async function flowDefault(user,textUser) {
    // Se não existir, manda mensagem de despedida
    var models = [];
    textUser= textUser.toLowerCase();
    const token = user.token;
    const phone = user.phone;
    const session = user.id_session;
    const name  = user.name; 
    const step = user.step_flow === "disconnect" ? "disconnect" : textUser;

    var redisClient = await redis.getUserState(session);    

    if (textUser === "await_session"){
        redisClient.step_flow = "default"; 

        const updateData = {"id_phone": phone, "updateData": redisClient}; 
        await updateClient(updateData);   
        await redis.setUserState(session, redisClient);

        models.push(whatsappModel.MessageText(`Ok ${user.name}! Me chame novamento quando quiser!! 😊`, phone)); 
        return models;
    }    

    switch (step) {
        case 'send_campaign':
            const returnCampaign = await sendTrigger(session,token);
            console.log("Enviar disparo de campanha: ",returnCampaign);
            models.push(whatsappModel.MessageText(`Perfeito ${name}! Disparo efetuado com sucesso para a lista de contatos. 😊`, phone));                                      
            break;          
        case 'input_models':     
            models.push(whatsappModel.MessageText(`Eita! Essa operação está em desenvolvimento 😎`, phone));                                      
            break;              
        case 'input_leads':
            models.push(whatsappModel.MessageText(`Otimo! Preciso que me envie um arquivo *csv* seguindo o modelo enviado.`, phone));                                      
            await sendDocumentModel(phone);
            break;                
        case 'await_session':
            models.push(whatsappModel.MessageText(`Ok ${user.name}! Me chame novamento quando quiser!! 😊`, phone));             
            break;    
        case 'delete_account':     

            await deleteClient(phone);
            await redis.deleteUserState(session);            
        
            const close = await closeSession(session,token); 
            console.log("Close Session", close);
            
            models.push(whatsappModel.MessageText(`Sua conta foi excluida 🥺. Mas fique tranquilo, sempre que quiser se conectar novamente conosco pode me chamar!! Fique bem 🥰!!`, phone));             
            break;    
        case 'default_operation':
            var operationList = whatsappModel.OperationDefault(phone); 
            models.push(operationList);
            break;                
        default:
            var textClient = `Olá ${user.name}, Bem vindo novamente!! Gostária de entrar na *menu* da sua sessão ?`;
            const decision_tree_way = ["default_operation", "await_session"];
            var button = whatsappModel.Button(textClient,phone,decision_tree_way);            
            models.push(button);    
            break;                                                      
            
    }
    return models;    
}


module.exports = flowDefault;
