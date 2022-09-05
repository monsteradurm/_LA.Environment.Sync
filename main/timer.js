import path from "path";
import fs from "fs";
import util from "util";
import { EnvironmentService } from './services/Environment.service.js'
import { timer } from "rxjs";
import { tap, switchMap } from "rxjs/operators";
import {fileURLToPath} from 'url';
import moment from 'moment';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var log_file = fs.createWriteStream(__dirname + '/../../_LA.Environment.Sync.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log(__dirname + '/../../_LA.Environment.Sync.log');
console.log = function(d) { //
    log_file.write(new moment().format('HH:MM:SS DD/MM/YYYY') + '\t' + util.format(d) + '\n');
    log_stdout.write(new moment().format('HH:MM:SS DD/MM/YYYY') + '\t' + util.format(d) + '\n');
  };

// pull environment changes every 5 minutes
timer(0, 1024 * 300).pipe(
    tap(t => console.log("Env Service --> Service Timer, " + t)),
    tap(t => {
        const LAREPO = 'C:/_LA.Repositories';
        const WDIREPO = 'C:/_WDI.Repositories';
    
        [LAREPO, WDIREPO].forEach(d => {
            if (!fs.existsSync(d)) {
                console.log(d + " Does not Exist, Creating...")
                fs.mkdirSync(d);
            }
        })
    }),
    switchMap(() => EnvironmentService.Synchronize$),
    tap(() => {
            const ENV_REPO = 'C:/_LA.Repositories/_Environment'
            const getDirectories = (root) => {
                
                return fs.readdirSync(root).filter(item => {
                    const path = root + '/' + item
                    try {
                        fs.statSync(path).isDirectory() && fs.existsSync(path + '/Documents');
                    } catch {
                        console.log("Could not read/write: " + path);
                        return false;
                    }
                })
            }
            getDirectories('C:/Users/').forEach(userProfile => {
                console.log(userProfile)
                const maya2018 = userProfile +'/Documents/maya/2018';
                const maya2022 = userProfile +'/Documents/maya/2022';
                if (fs.existsSync(maya2018)) {
                    const modules = maya2018 + '/modules'
                    if (!fs.existsSync(modules))
                        fs.mkdirSync(modules)

                    fs.copyFileSync(
                        ENV_REPO + '/_Environment.Maya.2018/Maya2018.Module/modules/la_maya2018.mod',
                        modules + '/la_maya2018.mod')
                }

                if (fs.existsSync(maya2022)) {
                    const modules = maya2022 + '/modules'
                    if (!fs.existsSync(modules))
                        fs.mkdirSync(modules)

                    fs.copyFileSync(
                        ENV_REPO + '/_Environment.Maya.2022/Maya2022.Module/modules/la_maya2022.mod',
                        modules + '/la_maya2022.mod')
                }
            })
    })
) 
.subscribe(() => { 

})