const path = require("path");
const auth = require("./handlers/auth");
const process = require("process");
const AUTH_API_PREFIX = process.env.AUTH_API_PREFIX;
const {authenticationMiddleware, bodyReader} = require("./middlewares");
const {getCookies} = require("./utils/apiUtils");
const constants = require("./utils/constants");
module.exports = async function (server) {
    process.env.PERSISTENCE_FOLDER = path.join(server.rootFolder, "external-volume", "balanceData");
    if(!process.env.SERVERLESS_STORAGE){
        console.error("SERVERLESS_STORAGE is missing, defaults to 'external-volume/appStorage'");
        process.env.SERVERLESS_STORAGE = path.join(server.rootFolder, "external-volume", "appStorage");
    }
    if(!process.env.SERVERLESS_ID){
        console.error("SERVERLESS_ID is missing setting default - gatekeeper");
        process.env.SERVERLESS_ID = constants.SERVERLESS_ID;
    }
    let serverUrl;
    setTimeout(async ()=>{
        const serverlessAPI = await server.createServerlessAPI({
            urlPrefix: process.env.SERVERLESS_ID,
            storage: path.resolve(process.env.SERVERLESS_STORAGE),
            env: process.env,
        });
        serverUrl = serverlessAPI.getUrl();
        server.registerServerlessProcessUrl(process.env.SERVERLESS_ID, serverUrl);
    },0);
    server.use(`/proxy/*`, bodyReader);
    server.use(`/proxy/*`, authenticationMiddleware);

    server.use(`${AUTH_API_PREFIX}/*`, (req, res, next) => {
        let cookies = getCookies(req);
        req.sessionId = cookies['sessionId'];
        req.userId = cookies['userId'];
        req.walletKey = cookies['walletKey'];
        req.email = cookies['email'];
        next();
    });
    server.get(`${AUTH_API_PREFIX}/userExists/:email`, auth.userExists);
    server.get(`${AUTH_API_PREFIX}/getInfo`, auth.getUserInfo);

    server.use(`${AUTH_API_PREFIX}/*`, bodyReader);

    server.post(`${AUTH_API_PREFIX}/generateAuthCode`, auth.generateAuthCode);
    server.post(`${AUTH_API_PREFIX}/walletLogin`, auth.walletLogin);
    server.post(`${AUTH_API_PREFIX}/walletLogout`, auth.walletLogout);

    server.put(`${AUTH_API_PREFIX}/setInfo`, auth.setUserInfo);
}
