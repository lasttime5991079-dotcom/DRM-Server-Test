const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');

async function testDRMServer() {
    console.log("[*] Starting Chrome on Linux Server...");
    const browser = await puppeteer.launch({
        headless: false, // xvfb ke sath chalega
        executablePath: '/usr/bin/google-chrome', 
        userDataDir: path.join(process.cwd(), 'chrome-profile'),
        defaultViewport: { width: 1280, height: 720 },
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--autoplay-policy=no-user-gesture-required',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = (await browser.pages())[0];
    const testUrl = 'https://dlhd.pk/watch.php?id=111';

    console.log(`[*] Going to URL: ${testUrl}`);
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    console.log("[*] Waiting 15 seconds for DRM and Video to load...");
    await new Promise(r => setTimeout(r, 15000));

    console.log("[*] Checking Video Status...");
    const videoData = await page.evaluate(() => {
        let status = { found: false, paused: true, time: 0 };
        const iframes = Array.from(document.querySelectorAll('iframe'));
        let v = document.querySelector('video');
        
        if (!v) {
            for (let ifr of iframes) {
                try {
                    let inner = ifr.contentWindow.document.querySelector('video');
                    if (inner) { v = inner; break; }
                } catch(e) {}
            }
        }
        if (v) {
            status.found = true;
            status.paused = v.paused;
            status.time = v.currentTime;
        }
        return status;
    });

    console.log("\n====== 📊 SERVER VIDEO REPORT ======");
    console.log(`- Video Found : ${videoData.found}`);
    console.log(`- Is Paused   : ${videoData.paused}`);
    console.log(`- Current Time: ${videoData.time} seconds`);
    console.log("====================================\n");

    if (videoData.time > 0) {
        console.log("[✅] SUCCESS: DRM Bypass ho gaya! Video is playing on Server.");
    } else {
        console.log("[❌] FAILED: Video at 0.0s. Server/Cloud IP block ya DRM fail.");
    }

    await browser.close();
}

testDRMServer();
