





const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');

async function testDRMServerWithScreenshot() {
    console.log("[*] Starting Real Chrome on Linux Server...");
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/usr/bin/google-chrome', 
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

    // const testUrl = 'https://dlhd.pk/watch.php?id=111';
    const testUrl = 'https://ww1.sportsonnline.click/channels/pt/eleven1.php';
    console.log(`[*] Going to URL: ${testUrl}`);
    
    try {
        await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch(e) {
        console.log("[!] Goto warning:", e.message);
    }

    console.log("[*] Waiting 30 seconds to let stream buffer and play...");
    await new Promise(r => setTimeout(r, 30000));

    // 🟢 VISUAL PROOF: Yahan par hum screenshot le rahe hain
    console.log("[*] Capturing Screenshot for Visual Proof...");
    await page.screenshot({ path: 'live-stream-proof.png', fullPage: true });
    console.log("[✅] Screenshot saved as 'live-stream-proof.png'");

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

    console.log("\n====== 📊 EXACT SERVER DIAGNOSTIC REPORT ======");
    console.log(`- Total Iframes Scanned : ${report.totalFrames}`);
    console.log(`- Widevine DRM Active?  : ${report.emeSupported}`);
    console.log(`- Video Element Found?  : ${report.videoFound}`);
    console.log(`- Video Iframe URL      : ${report.frameUrl}`);
    console.log(`- Is Paused             : ${report.paused}`);
    console.log(`- Current Time          : ${report.currentTime} seconds`);
    console.log(`- Screen Error Message  : ${report.errorTextOnScreen}`);
    console.log("===============================================\n");

    await browser.close();
}

testDRMServerWithScreenshot();














// # =========== yaha par tuu kehraha hai k video play hu raha hai lekin yeh raw proof hai aab upper scrreshot add karty hai ================



// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// puppeteer.use(StealthPlugin());
// const path = require('path');

// async function monitorLiveStream() {
//     console.log("\n[*] Starting Real Chrome on Linux Server (Single Instance)...");
    
//     // 🟢 Browser sirf ek dafa launch hoga
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
//             // Cloudflare WARP Proxy
//             '--proxy-server=socks5://127.0.0.1:40000',
//             '--alsa-output-device=default'
//         ]
//     });

//     const page = (await browser.pages())[0];
    
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
//         emeSupported: false
//     };

//     let targetFrame = null;

//     for (const frame of page.frames()) {
//         try {
//             if (frame.isDetached()) continue;
//             const data = await frame.evaluate(async () => {
//                 let drmOk = false;
//                 try {
//                     await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{
//                         initDataTypes: ['cenc'],
//                         videoCapabilities: [{ contentType: 'video/mp4;codecs="avc1.42E01E"' }]
//                     }]);
//                     drmOk = true;
//                 } catch(e) {}

//                 const v = document.querySelector('video');
//                 if (v) {
//                     if (v.paused) { v.muted = false; v.play().catch(()=>{}); } 
//                     return { found: true, drmOk: drmOk };
//                 }
//                 return null;
//             });

//             if (data && data.found) {
//                 report.videoFound = true;
//                 report.frameUrl = frame.url();
//                 report.emeSupported = data.drmOk;
//                 targetFrame = frame;
//                 break;
//             }
//         } catch (e) {}
//     }

//     // 🟢 Agar video mil gayi, toh ab yeh loop forever chalega bina Chrome close kiye
//     if (targetFrame) {
//         console.log(`\n[*] Video Found! Starting Live Time Tracker (Updating every 5 seconds) in the SAME Chrome window...\n`);
        
//         let updateCount = 1;
//         while (true) {
//             try {
//                 const liveData = await targetFrame.evaluate(() => {
//                     const v = document.querySelector('video');
//                     const bodyText = document.body ? document.body.innerText : '';
//                     const hasPlaybackError = bodyText.includes('Playback error') || bodyText.includes('protected content');
                    
//                     if (v) {
//                         return {
//                             paused: v.paused,
//                             time: v.currentTime,
//                             errText: hasPlaybackError ? 'Playback error: protected content' : 'None'
//                         };
//                     }
//                     return null;
//                 });

//                 if (liveData) {
//                     console.log(`====== 📊 LIVE TRACKING UPDATE #${updateCount} ======`);
//                     console.log(`- Total Iframes Scanned : ${report.totalFrames}`);
//                     console.log(`- Widevine DRM Active?  : ${report.emeSupported}`);
//                     console.log(`- Video Element Found?  : true`);
//                     console.log(`- Video Iframe URL      : \n${report.frameUrl}`);
//                     console.log(`- Is Paused             : ${liveData.paused}`);
//                     console.log(`- Current Time          : ${liveData.time} seconds`);
//                     console.log(`- Screen Error Message  : ${liveData.errText}`);
//                     console.log(`===============================================`);
//                 } else {
//                     console.log(`[!] Video disappeared from frame. Player might be reloading...`);
//                 }
//             } catch (err) {
//                 console.log(`[!] Frame evaluation error. Iframe might be refreshing...`);
//             }

//             updateCount++;
//             // 🟢 Theek 5 second ka wait aur phir wahi video dobaara check hogi
//             await new Promise(r => setTimeout(r, 5000));
//         }
//     } else {
//         console.log("[-] Video element not found in any frame. Browser will stay OPEN for manual inspection.");
//     }
// }

// // 🟢 Sirf ek function call, koi bahar wala loop nahi
// monitorLiveStream();










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
