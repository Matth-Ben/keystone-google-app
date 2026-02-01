export { }

console.log("Keystone Background Service Worker Running")

chrome.runtime.onInstalled.addListener(() => {
    console.log("Keystone Extension Installed")
})
