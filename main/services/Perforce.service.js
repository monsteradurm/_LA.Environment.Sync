import P4 from "p4api"
import { LAREPO } from "./Environment.service.js";
import { ENVIRONMENT_LOGIN } from "./Environment.service.js";

const TIMEOUT = 500000;
export class PerforceService {
    static async Login() {
        
        const p4 = new P4.P4({ 
            p4set: {
                P4PORT: ENVIRONMENT_LOGIN.Server,
                P4API_TIMEOUT: TIMEOUT}
        });

        p4.addOpts({env:{P4USER: ENVIRONMENT_LOGIN.Username}})
        await PerforceService.Trust(p4, ENVIRONMENT_LOGIN.Username);
        return await p4.cmd("login", ENVIRONMENT_LOGIN.Password);
        //return await p4.cmd("login -s");
    }

    static async Connection() {
        //TrustArgs { get; set; } = "-p ssl:52.147.58.109:1666 trust -y";
        const {Server, Username, Password} = ENVIRONMENT_LOGIN;
        const p4 = new P4.P4({ 
            p4set: {
                P4PORT: Server,
                P4API_TIMEOUT: TIMEOUT}
        });

        await PerforceService.Trust(p4);
        p4.addOpts({env:{P4USER: ENVIRONMENT_LOGIN.Username}});
        const result = await p4.cmd("login", Password);

        return p4;
    }

    static async Trust(p4) {
        const result = await p4.cmd(`-p ${ENVIRONMENT_LOGIN.Server} -u ${ENVIRONMENT_LOGIN.Username} trust -y`);
    }

    static get LastConnection() {
        const p4 = new P4.P4({ 
            p4set: {
                P4PORT: ENVIRONMENT_LOGIN.Server,
                P4API_TIMEOUT: TIMEOUT}
        });
        return p4;
    }

    static async Clients() {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();

        return await p4.cmd("clients -u " + ENVIRONMENT_LOGIN.Username);       
    }

    static async Depots() {
        console.log("retrieving all depots");
        const p4 = await PerforceService.Connection();
        return await p4.cmd("depots");
    }


    static async Where(map, client) {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();

        await p4.cmd("set P4CLIENT=" + client);
        return await p4.cmd("where //" + map + "/...")
    }

    static async Groups() {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();
        return await p4.cmd("groups -u " + login.Username);
    }

    static async Protects() {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();
        return await p4.cmd("protects -u " + ENVIRONMENT_LOGIN.Username);
    }

    static async Users() {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();
        return await p4.cmd("users");
    }

    static async Client(name) {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();
        PerforceService.SetClientConfig(p4, name);
        let out = await p4.cmd("client -o")
        return out;
    }

    static async SetIgnore(client, ignore) {
        let p4 = PerforceService.LastConnection;
        if (login)
            p4 = await PerforceService.Connection();
        PerforceService.SetClientConfig(p4, client);
        p4.addOpts({env: {P4Ignore:ignore.replace('\\', '/')}})
    };

    static async SetClientConfig(p4, client) {
        p4.addOpts({env:{
            P4CLIENT:client, 
            P4CONFIG: "p4config.txt",
            }
        })
    } 

    static async Sync(client, from, to) {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();
        PerforceService.SetClientConfig(p4, client);
        return await p4.cmd(`sync -s ${from} ${to}`);
    }

    static async UpsertClient(config) {
        let p4 = PerforceService.LastConnection;
        p4 = await PerforceService.Connection();
        console.log('p4 client -i < ' + config);

        const result = await p4.rawCmd('client -i ', config);
    }

}