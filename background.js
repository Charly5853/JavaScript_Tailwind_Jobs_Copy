chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openJobSites" && Array.isArray(message.urls)) {
        for (const url of message.urls) {
            chrome.tabs.create({ url });
        }
    }
});
