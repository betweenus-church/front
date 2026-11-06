import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
const root=process.cwd();
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
for(const app of ['client','admin']){
 const require=createRequire(path.join(root,app,'package.json'));
 for(const entry of ['@sai/shared/api','@sai/shared/news','@sai/shared/daily-word','@sai/ui/tokens.css','@sai/ui/base.css','@sai/ui/components.css','@sai/ui/theme.css'])assert.ok(existsSync(require.resolve(entry)));
 for(const file of walk(path.join(app,'src')).filter(f=>/\.tsx?$/.test(f))){
  const source=readFileSync(file,'utf8');
  for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)){
   if(!match[1].startsWith('.'))continue;
   const target=path.resolve(path.dirname(file),match[1]);
   assert.ok(target.startsWith(path.join(root,app)+path.sep),'Cross-app source import: '+file);
  }
 }
}
assert.ok(!existsSync('client/src/app/admin'));
assert.ok(!existsSync('admin/src/app/community'));
console.log('Both apps resolve shared packages; app boundaries passed.');
