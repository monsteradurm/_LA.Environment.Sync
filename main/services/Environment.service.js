import { EMPTY, from, timer, of, combineLatest } from "rxjs";
import { PerforceService } from "./perforce.service.js";
import { tap, map, switchMap, concatMap, shareReplay, take } from 'rxjs/operators';
import os from "os";
import fs from "fs";
import * as _ from 'underscore';
import moment from 'moment';

export const LAREPO = 'ssl:52.147.58.109:1666';
export const ENVIRONMENT_ROOT = "C:/_LA.Repositories/_Environment";
export const ENVIRONMENT_LOGIN = {
    Server: LAREPO,
    Username: 'liquid-perforce',
    Password: 'Goodbyemoonmen!',
    Host: os.hostname()
}
export const ENVIRONMENT_CLIENT = `${ENVIRONMENT_LOGIN.Username}.${ENVIRONMENT_LOGIN.Host}._Environment`;
export class EnvironmentService {  
    
    static LastLogin$ = from(PerforceService.Login()).pipe(
        tap(t => console.log("LOGIN RESULT: " + JSON.stringify(t))),
        shareReplay(1),
    )

    static InitializeEnvironmentClient$ = from(PerforceService.UpsertClient(
            `Client: ${ENVIRONMENT_CLIENT}\n` +
            `Root: \t${ENVIRONMENT_ROOT}\n` + 
            `Owner: ${ENVIRONMENT_LOGIN.Username}\n` +
            `Host: \t${ENVIRONMENT_LOGIN.Host}\n`)
        ).pipe(
            switchMap(() => 
                PerforceService.Client(ENVIRONMENT_CLIENT).pipe(take(1))),
            take(1)
        )

    static Client$ = from(PerforceService.Client(ENVIRONMENT_CLIENT)).pipe(
            switchMap(client => client ? 
                of(client) : EnvironmentService.InitializeEnvironmentClient$
            ),
            map( result => result.stat[0]),
        )

    static Environments$ = from(PerforceService.Depots()).pipe(
        tap(t => console.log("Environments (depots):" + JSON.stringify(t))),
        map(result => _.pluck(result.stat, 'name')),
        tap(t => console.log("Environments (names):" + JSON.stringify(t))),
        map(depots => _.filter(depots, d => d.indexOf('_Environment') === 0)),
        take(1)
    )

    static UpsertClient = (views) => {
        console.log("UPSERTING CLIENT");
        let config = `Client: ${ENVIRONMENT_CLIENT}\n` +
        `Root: \t${ENVIRONMENT_ROOT}\n` + 
        `Owner: ${ENVIRONMENT_LOGIN.Username}\n` +
        `Host: \t${ENVIRONMENT_LOGIN.Host}\n` +
        'Options:   noallwrite clobber nocompress unlocked nomodtime normdir\n\n';

        if (views && views.length > 0) {
            config += 'View:\n'
            views.forEach(v => config += '\t' + v + '\n')
        }

        return from(PerforceService.UpsertClient(config)).pipe(
            switchMap(result => 
                PerforceService.Client(ENVIRONMENT_CLIENT))
        )
    }
    
    
    static GetViews(client) {
        return _.uniq(Object.keys(client).filter(a => a.indexOf('View') === 0).map(
            a => client[a]
        ));
    }

    static ValidateClient$(client, env) {
        const views = EnvironmentService.GetViews(client);
        console.log("VIEWS: " + JSON.stringify(views));
        const root = ENVIRONMENT_ROOT + "/" + env;

        if (!fs.existsSync(root)) {
            console.log('Env Service --> ' + ENVIRONMENT_ROOT + ' Does not Exist, Creating...');
            fs.mkdirSync(root)
        }

        const mapping = '//' + env + '/... ' + '//' + ENVIRONMENT_CLIENT + '/' + env + '/...';

        
        if (views.indexOf(mapping) < 0) {
            console.log("Adding View to Client: " + mapping);
            views.push(mapping);
            return EnvironmentService.UpsertClient(views).pipe(
                    map(result => result.stat[0]),
                    take(1)
            )
        } else {
            console.log("VIEW IS ALREADY MAPPED");
        }

        return of(client);
        
    }
    static SynchronizeEnvironment$ = (env) => {
        console.log("Synchronizing: " + env + '...');
        const depotPath = '//' + env + '/... ';
        const clientPath = '//' + ENVIRONMENT_CLIENT + '/' + env + '/...';

        return from(
                PerforceService.Sync(ENVIRONMENT_CLIENT, depotPath, clientPath)
        ).pipe(
            map(result => result.error && result.error.filter(e => e.data.indexOf('up-to-date') > -1).length > 0 ?
                { result: env + ' is already syncronized...'} : result),
            tap(result => console.log("Env Service --> " + env 
            + " Synchonization Result: " + JSON.stringify(result) + "\n"))
        )

    }

    static Synchronize$ = EnvironmentService.Environments$.pipe(
        tap(() => console.log("Env Service --> Iterating Over Environment Depots")),
        tap(environments => console.log(JSON.stringify(environments) + "\n")),
        switchMap(environments => from(environments).pipe(
                concatMap(env => 
                    EnvironmentService.Client$.pipe(
                        switchMap(client => 
                            EnvironmentService.ValidateClient$(client, env).pipe(
                                switchMap(client => 
                                    EnvironmentService.SynchronizeEnvironment$(env))
                            )
                        )
                    )
                )
            )
        )
    )
}