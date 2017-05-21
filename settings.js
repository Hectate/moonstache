var ipc = require('electron').ipcRenderer;
var remote = require('electron').remote;

//Document elements
var settingsCancelEl;
var settingsSaveEl;
var pathDisplayEl;
var saveSessionEl;
var activeThemeEl;

pathDisplayEl = document.getElementById('settings-path-text-value');
saveSessionEl = document.getElementById('settings-save-session-checkbox');
activeThemeEl = document.getElementById('settings-select-active-theme');

//local vars for states represented by elements
var tempconfig = remote.getGlobal('appconfig');

//Fill in the current config for the user to see
ipc.on('fill-settings-form', function () {
  pathDisplayEl.value = tempconfig.path;
  saveSessionEl.checked = tempconfig.save;
  activeThemeEl.value = tempconfig.theme;
});

//set up the cancel button
settingsCancelEl = document.getElementById('settings-window-cancel-button');
settingsCancelEl.addEventListener('click', function () {
    ipc.send('close-settings-window');
});

//set up the save button
settingsSaveEl = document.getElementById('settings-window-save-button');
settingsSaveEl.addEventListener('click', function () {
    tempconfig.save = saveSessionEl.checked;
    tempconfig.theme = activeThemeEl.value;
    tempconfig.path = pathDisplayEl.value;
    ipc.send('save-settings',tempconfig);
    ipc.send('close-settings-window');
});
