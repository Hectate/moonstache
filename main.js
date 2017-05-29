const electron = require('electron');
var ipcMain = require('electron').ipcMain;
var fs = require('fs');
// Module to control application life.
const app = electron.app
const dialog = electron.dialog;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

global.appconfig = require( __dirname + '/json/appconfig.json');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let settingsWindow;

function createWindow () {
  // Create the browser window.
  //get max size window if we want it
  //const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
  //mainWindow = new BrowserWindow({
   // width,
   // height,
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: true,
    useContentSize: true,
    title: "Moonstache",
    autoHideMenuBar: false,
    icon: __dirname + '/assets/icons/png/moon_app_icon_64.png'
  })

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
  mainWindow.maximize();

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('open-settings-window', function () {
    settingsWindow = new BrowserWindow({
      parent:mainWindow,
      modal:true,
      show:false,
      autoHideMenuBar: true,
      frame:false,
      height:380,
      transparent:true,
      useContentSize:true
    });
    settingsWindow.loadURL(`file://${__dirname}/settings.html`);
    settingsWindow.once('ready-to-show', () => {
      settingsWindow.webContents.send('fill-settings-form');
      settingsWindow.show();
    });
});

ipcMain.on('close-settings-window', function () {
  mainWindow.send('modal-hide');
  settingsWindow.close();
});

ipcMain.on('save-settings', (event, arg) => {
  saveSettings(arg);
});

function saveSettings(config) {
  console.log("Saving settings to disk...");
  appconfig.theme = config.theme;
  appconfig.save = config.save;
  appconfig.path = config.path;
  console.log(appconfig);
}

function getFile() {
  return new Promise(function(resolve,reject) {
    dialog.showOpenDialog(function (fileNames) {
      if(fileNames === undefined) {
        reject("No file selected");
      }
      else {
        fs.readFile(fileNames[0], 'utf-8', function (err, data) {
            if(err) {
              reject("An error ocurred reading the file :" + err.message);
            }
            //console.log(data);
            resolve(data);
        });
      }
    });
  });
}