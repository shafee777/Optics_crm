const fs=require('node:fs/promises');const path=require('node:path');
async function copy(source,destination){const stat=await fs.stat(source);if(stat.isDirectory()){await fs.mkdir(destination,{recursive:true});for(const item of await fs.readdir(source))await copy(path.join(source,item),path.join(destination,item));}else{await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(source,destination);}}
(async()=>{const root=path.resolve(__dirname,'../..'),payload=path.join(root,'desktop/payload');await fs.mkdir(path.join(payload,'backend'),{recursive:true});
for(const name of ['src','database/migrations','package.json','package-lock.json'])await copy(path.join(root,'backend',name),path.join(payload,'backend',name),{recursive:true});
await copy(path.join(root,'frontend/dist'),path.join(payload,'frontend/dist'),{recursive:true});
await copy(path.join(root,'shared'),path.join(payload,'shared'),{recursive:true});
console.log('Staged application source and assets. No .env, shop records or development seed data copied.');
})().catch(e=>{console.error(e);process.exitCode=1});
