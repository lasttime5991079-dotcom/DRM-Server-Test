const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');

async function testDRMServer(runNumber) {
    console.log(`\n[*] Starting Real Chrome on Linux Server for Run #${runNumber}...`);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            executablePath: '/usr/bin/google-chrome-stable', 
            userDataDir: path.join(process.cwd(), 'chrome-profile'),
            defaultViewport: { width: 1280, height: 720 },
            ignoreDefaultArgs: ['--enable-automation'],
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--autoplay-policy=no-user-gesture-required',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1280,720',
                // 🟢 Cloudflare WARP Proxy taake Datacenter IP block na ho
                '--proxy-server=socks5://127.0.0.1:40000'
            ]
        });

        const page = (await browser.pages())[0];
        
        // 🟢 DRM / EME support check karne ke liye
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`[PAGE CONSOLE ERROR]: ${msg.text()}`);
        });

        const testUrl = 'https://dlhd.pk/watch.php?id=111';
        console.log(`[*] Going to URL: ${testUrl}`);
        try {
            await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        } catch(e) {
            console.log("[!] Goto warning:", e.message);
        }

        console.log("[*] Waiting 20 seconds for Nested Iframes, DRM & Video to load...");
        await new Promise(r => setTimeout(r, 20000));

        console.log("[*] Scanning ALL Nested Iframes using page.frames()...");
        
        let report = {
            totalFrames: page.frames().length,
            videoFound: false,
            frameUrl: 'None',
            paused: true,
            currentTime: 0,
            readyState: 0,
            errorTextOnScreen: 'None',
            emeSupported: false
        };

        for (const frame of page.frames()) {
            try {
                if (frame.isDetached()) continue;
                const data = await frame.evaluate(async () => {
                    // Check if Widevine DRM is actually working in this browser
                    let drmOk = false;
                    try {
                        await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{
                            initDataTypes: ['cenc'],
                            videoCapabilities: [{ contentType: 'video/mp4;codecs="avc1.42E01E"' }]
                        }]);
                        drmOk = true;
                    } catch(e) {}

                    const bodyText = document.body ? document.body.innerText : '';
                    const hasPlaybackError = bodyText.includes('Playback error') || bodyText.includes('protected content');
                    
                    const v = document.querySelector('video');
                    if (v) {
                        // Try to force play if paused
                        if (v.paused) { v.muted = true; v.play().catch(()=>{}); }
                        return {
                            found: true,
                            paused: v.paused,
                            time: v.currentTime,
                            readyState: v.readyState,
                            errText: hasPlaybackError ? 'Playback error: protected content' : 'None',
                            drmOk: drmOk
                        };
                    }
                    if (hasPlaybackError) {
                        return { found: false, errText: 'Playback error: protected content', drmOk: drmOk };
                    }
                    return null;
                });

                if (data) {
                    if (data.errText !== 'None') report.errorTextOnScreen = data.errText;
                    if (data.drmOk) report.emeSupported = true;
                    if (data.found) {
                        report.videoFound = true;
                        report.frameUrl = frame.url();
                        report.paused = data.paused;
                        report.currentTime = data.time;
                        report.readyState = data.readyState;
                        report.emeSupported = data.drmOk;
                        break;
                    }
                }
            } catch (e) {}
        }

        console.log(`\n====== 📊 RUN #${runNumber} DIAGNOSTIC REPORT ======`);
        console.log(`- Total Iframes Scanned : ${report.totalFrames}`);
        console.log(`- Widevine DRM Active?  : ${report.emeSupported}`);
        console.log(`- Video Element Found?  : ${report.videoFound}`);
        console.log(`- Video Iframe URL      : ${report.frameUrl}`);
        console.log(`- Is Paused             : ${report.paused}`);
        console.log(`- Current Time          : ${report.currentTime} seconds`);
        console.log(`- Screen Error Message  : ${report.errorTextOnScreen}`);
        console.log("===============================================\n");

    } catch (error) {
        console.log(`[!] CRITICAL ERROR in Run #${runNumber}:`, error.message);
    } finally {
        if (browser) {
            await browser.close();
            console.log(`[*] Browser forcefully closed for Run #${runNumber} to free RAM.`);
        }
    }
}

// 🟢 NEW: Loop Control Function
async function startContinuousTesting() {
    let runNumber = 1;
    while (true) {
        console.log(`\n>>>>>>>> STARTING TEST LOOP #${runNumber} <<<<<<<<`);
        
        await testDRMServer(runNumber);
        
        // Loop ke darmiyan 30 seconds ka gap taake server block na kare
        console.log(`\n⏳ Test #${runNumber} completed. Waiting 30 seconds before the next run...`);
        await new Promise(r => setTimeout(r, 30000)); 
        
        runNumber++;
    }
}

// Start the continuous loop
startContinuousTesting();











// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());
// const path = require('path');

// async function testDRMServer() {
//     console.log("[*] Starting Real Chrome on Linux Server...");
//     const browser = await puppeteer.launch({
//         headless: false,
//         executablePath: '/usr/bin/google-chrome-stable', 
//         userDataDir: path.join(process.cwd(), 'chrome-profile'),
//         defaultViewport: { width: 1280, height: 720 },
//         ignoreDefaultArgs: ['--enable-automation'],
//         args: [
//             '--no-sandbox', 
//             '--disable-setuid-sandbox', 
//             '--autoplay-policy=no-user-gesture-required',
//             '--disable-blink-features=AutomationControlled',
//             '--window-size=1280,720',
//             // 🟢 Cloudflare WARP Proxy taake Datacenter IP block na ho
//             '--proxy-server=socks5://127.0.0.1:40000'
//         ]
//     });

//     const page = (await browser.pages())[0];
    
//     // 🟢 DRM / EME support check karne ke liye
//     page.on('console', msg => {
//         if (msg.type() === 'error') console.log(`[PAGE CONSOLE ERROR]: ${msg.text()}`);
//     });

//     const testUrl = 'https://dlhd.pk/watch.php?id=111';
//     console.log(`[*] Going to URL: ${testUrl}`);
//     try {
//         await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
//     } catch(e) {
//         console.log("[!] Goto warning:", e.message);
//     }

//     console.log("[*] Waiting 20 seconds for Nested Iframes, DRM & Video to load...");
//     await new Promise(r => setTimeout(r, 20000));

//     console.log("[*] Scanning ALL Nested Iframes using page.frames()...");
    
//     let report = {
//         totalFrames: page.frames().length,
//         videoFound: false,
//         frameUrl: 'None',
//         paused: true,
//         currentTime: 0,
//         readyState: 0,
//         errorTextOnScreen: 'None',
//         emeSupported: false
//     };

//     for (const frame of page.frames()) {
//         try {
//             if (frame.isDetached()) continue;
//             const data = await frame.evaluate(async () => {
//                 // Check if Widevine DRM is actually working in this browser
//                 let drmOk = false;
//                 try {
//                     await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{
//                         initDataTypes: ['cenc'],
//                         videoCapabilities: [{ contentType: 'video/mp4;codecs="avc1.42E01E"' }]
//                     }]);
//                     drmOk = true;
//                 } catch(e) {}

//                 const bodyText = document.body ? document.body.innerText : '';
//                 const hasPlaybackError = bodyText.includes('Playback error') || bodyText.includes('protected content');
                
//                 const v = document.querySelector('video');
//                 if (v) {
//                     // Try to force play if paused
//                     if (v.paused) { v.muted = true; v.play().catch(()=>{}); }
//                     return {
//                         found: true,
//                         paused: v.paused,
//                         time: v.currentTime,
//                         readyState: v.readyState,
//                         errText: hasPlaybackError ? 'Playback error: protected content' : 'None',
//                         drmOk: drmOk
//                     };
//                 }
//                 if (hasPlaybackError) {
//                     return { found: false, errText: 'Playback error: protected content', drmOk: drmOk };
//                 }
//                 return null;
//             });

//             if (data) {
//                 if (data.errText !== 'None') report.errorTextOnScreen = data.errText;
//                 if (data.drmOk) report.emeSupported = true;
//                 if (data.found) {
//                     report.videoFound = true;
//                     report.frameUrl = frame.url();
//                     report.paused = data.paused;
//                     report.currentTime = data.time;
//                     report.readyState = data.readyState;
//                     report.emeSupported = data.drmOk;
//                     break;
//                 }
//             }
//         } catch (e) {}
//     }

//     console.log("\n====== 📊 EXACT SERVER DIAGNOSTIC REPORT ======");
//     console.log(`- Total Iframes Scanned : ${report.totalFrames}`);
//     console.log(`- Widevine DRM Active?  : ${report.emeSupported}`);
//     console.log(`- Video Element Found?  : ${report.videoFound}`);
//     console.log(`- Video Iframe URL      : ${report.frameUrl}`);
//     console.log(`- Is Paused             : ${report.paused}`);
//     console.log(`- Current Time          : ${report.currentTime} seconds`);
//     console.log(`- Screen Error Message  : ${report.errorTextOnScreen}`);
//     console.log("===============================================\n");

//     await browser.close();
// }

// testDRMServer();
