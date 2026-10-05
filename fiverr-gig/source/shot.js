const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch();
for (const [s,f] of [[1,'gig-1280x769.png'],[2,'gig-HD-2560x1538.png']]){
 const p=await b.newPage({viewport:{width:1280,height:769},deviceScaleFactor:s});
 await p.goto('file://'+process.cwd()+'/gig.html');await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);
 await p.screenshot({path:f});}
await b.close();})();
