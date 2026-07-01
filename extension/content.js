// Bridge messages from the web app page to the extension background script
window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === "focusflow-webapp") {
        chrome.runtime.sendMessage(event.data);
    }
});

// Bridge messages from the extension background/popup script to the web app page
chrome.runtime.onMessage.addListener((message) => {
    window.postMessage({ source: "focusflow-extension", ...message }, "*");
    return true;
});
