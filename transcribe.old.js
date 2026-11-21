require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function ingestAudio() {
    const requires_animation = false;

    // Stage: Env Check
    try {
        console.log("Checking environment variables...");
        const requiredEnv = ['GEMINI_API_KEY', 'PIXABAY_API_KEY', 'MAKE_WEBHOOK_URL'];
        const missingEnv = requiredEnv.filter((key) => !process.env[key]);
        if (missingEnv.length > 0) {
            throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
        }
        console.log("[CHECK 0/6 PASS] Env Check");
    } catch (error) {
        console.error(`[STAGE FAILED: Env Check] ${error.message}`);
        return;
    }

    // Stage 1: File Upload
    let uploadResult;
    try {
        console.log("Uploading audio to Gemini...");
        uploadResult = await ai.files.upload({
            file: '01-Raw-Inbox/testAusinConvoAudio.m4a',
            config: { mimeType: 'audio/m4a' }
        });
        console.log("[CHECK 1/6 PASS] File Upload");
    } catch (error) {
        console.error(`[STAGE FAILED: File Upload] ${error.message}`);
        return;
    }

    // Stage 2: Strategist LLM
    let strategyText;
    try {
        console.log("Extracting transcript and strategy...");
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
                { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
                "Transcribe this audio exactly, then extract 3 strategic content pillars."
            ]
        });
        strategyText = response.text;
        console.log("[CHECK 2/6 PASS] Strategist LLM");
    } catch (error) {
        console.error(`[STAGE FAILED: Strategist LLM] ${error.message}`);
        return;
    }

    // Stage 3: Creative Director JSON Parse
    let directorResponse;
    let directorData;
    try {
        console.log("Directing the video format...");
        const directorPrompt = `You are a Creative Director. Take these pillars: ${strategyText}. Output a strict JSON object with this exact structure: { "hook": "string", "script_body": "string", "camera_angle": "string", "b_roll_search_term": "string" }`;

        directorResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: directorPrompt,
            config: { responseMimeType: "application/json" }
        });

        console.log("Creative Director Output:", directorResponse.text);
        directorData = JSON.parse(directorResponse.text);
        console.log("[CHECK 3/6 PASS] Creative Director JSON Parse");
    } catch (error) {
        console.error(`[STAGE FAILED: Creative Director JSON Parse] ${error.message}`);
        return;
    }

    // Stage 4: Pixabay API
    let videoUrl;
    try {
        console.log("Fetching B-Roll from Pixabay...");
        const cleanQuery = encodeURIComponent(directorData.b_roll_search_term);
        const pixabayRes = await fetch(`https://pixabay.com/api/videos/?key=${process.env.PIXABAY_API_KEY}&q=${cleanQuery}&per_page=3`);
        if (!pixabayRes.ok) {
            throw new Error(`Pixabay HTTP ${pixabayRes.status}: ${pixabayRes.statusText}`);
        }
        const pixabayData = await pixabayRes.json();
        videoUrl = pixabayData.hits?.[0]?.videos?.medium?.url || "No video found for this term.";
        console.log("B-Roll Link Captured:", videoUrl);
        console.log("[CHECK 4/6 PASS] Pixabay API");
    } catch (error) {
        console.error(`[STAGE FAILED: Pixabay API] ${error.message}`);
        return;
    }

    const fullText = strategyText + "\n\n" + directorResponse.text + "\n\nB-Roll Link: " + videoUrl;

    // Stage 5: Local File Write
    try {
        fs.mkdirSync('02-Ready-To-Publish', { recursive: true });
        fs.writeFileSync('02-Ready-To-Publish/transcript.txt', fullText);
        console.log("Success! Output saved to transcript.txt");
        console.log("[CHECK 5/6 PASS] Local File Write");
    } catch (error) {
        console.error(`[STAGE FAILED: Local File Write] ${error.message}`);
        return;
    }

    // Stage 6: Make.com Webhook POST
    try {
        console.log("Pushing draft to Make.com Webhook...");
        const webhookRes = await fetch(process.env.MAKE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: fullText })
        });

        if (!webhookRes.ok) {
            throw new Error(`Webhook HTTP ${webhookRes.status}: ${webhookRes.statusText}`);
        }
        console.log("Success! Draft sent to Slack for approval.");
        console.log("[CHECK 6/6 PASS] Make.com Webhook POST");
    } catch (error) {
        console.error(`[STAGE FAILED: Make.com Webhook POST] ${error.message}`);
        return;
    }
}
ingestAudio();