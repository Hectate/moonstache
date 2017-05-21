// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var ipc = require('electron').ipcRenderer;
var remote = require('electron').remote;
var WebSocket = require('ws');
var ws = {};
var os = require('os');
var fs = require('fs');
const {dialog} = require('electron').remote;
const {clipboard} = require('electron').remote;
var serverIP = "158.69.196.28";
var serverPort = "5000";
var username = "Hectate";
var pass = "CheckOutThisPassword";
const greeting = {password:pass,author:username};

var sanitizeHtml = require('sanitize-html');

//Selectors
var serverNameEl = document.getElementById('server-name-text');
var serverIPEl = document.getElementById('server-ip-text');
var serverPortEl = document.getElementById('server-port-text');
var serverSaveCheckEl = document.getElementById('server-save-checkbox');
var serverConnectButtonEl = document.getElementById('server-connect-button');
var settingsEl = document.getElementById('settings-button');
var navServerEl = document.getElementById('nav-server');
var outputBoxEl = document.getElementById("output-box");
var outputDivEl = document.getElementById('output-div');
var saveOutputEl = document.getElementById('save-output-button');
var copyOutputEl = document.getElementById('copy-output-button');
var clearOutputEl = document.getElementById('clear-output-button');
var closeOutputEl = document.getElementById('close-output-button');
var toggleOutputEl = document.getElementById('toggle-output-button');
var chatWindowBoxEl = document.getElementById('chat-window-box');
var chatWindowTableEl = document.getElementById('chat-window-table');
var chatTextInputEl = document.getElementById('chat-input-text');
var chatSendButtonEl = document.getElementById('chat-send-button');
var gridSmall = false;
var navUsersEl = document.getElementById('nav-users');
var navBackgroundsEl = document.getElementById('nav-backgrounds');
var navBehaviorsEl = document.getElementById('nav-behaviors');
var navExtensionsEl = document.getElementById('nav-extensions');
var navFontsEl = document.getElementById('nav-fonts');
var navScenesEl = document.getElementById('nav-scenes');
var navSettingsEl = document.getElementById('nav-settings');
var navSoundsEl = document.getElementById('nav-sounds');
var navSettingsEl = document.getElementById('nav-settings');
var navTilesetsEl = document.getElementById('nav-tilesets');

//Settings button functions
settingsEl.addEventListener('click', function () {
  //modal = UIkit.modal.blockUI('Config');
  //setTimeout(function(){modal.hide()},5000);
  ipc.send('open-settings-window');
});
ipc.on('modal-hide', function() {
  console.log('hiding modal');
  modal.hide();
});

//Navs for users views
navServerEl.addEventListener('click',function () { console.log("server connection needed."); });
serverConnectButtonEl.addEventListener('click', function () {
  addToOutput("Connecting to " + serverIP + ":" + serverPort);
  connectToServer(serverIP + ":" + serverPort);
});
navUsersEl.addEventListener('click', function () { toggleActive(navUsersEl); });
navBackgroundsEl.addEventListener('click', function () { toggleActive(navBackgroundsEl); });
navBehaviorsEl.addEventListener('click', function () { toggleActive(navBehaviorsEl); });
navExtensionsEl.addEventListener('click', function () { toggleActive(navExtensionsEl); });
navFontsEl.addEventListener('click', function () { toggleActive(navFontsEl); });
navScenesEl.addEventListener('click', function () { toggleActive(navScenesEl); });
navSettingsEl.addEventListener('click', function () { toggleActive(navSettingsEl); });
navSoundsEl.addEventListener('click', function () { toggleActive(navSoundsEl); });
navTilesetsEl.addEventListener('click', function () { toggleActive(navTilesetsEl); });
chatTextInputEl.addEventListener('keyup', function (event) {
  if(event.keyCode == 13) {
    if(chatTextInputEl.value !== "") {
      sendMessage(chatTextInputEl.value);
      chatTextInputEl.value = "";
    }
  }
});
chatSendButtonEl.addEventListener('click', function () {
  if(chatTextInputEl.value !== "") {
    sendMessage(chatTextInputEl.value);
    chatTextInputEl.value = "";
  }
});

function sendMessage(string) {
  var o = {
    message:string,
    author:username,
    type:"message"
  };
  //addToOutput(JSON.stringify(o));
  ws.send(JSON.stringify(o));
}

function connectToServer(server) {
  ws = new WebSocket("ws://" + server);

  ws.on('open', function open() {
    ws.send(JSON.stringify(greeting));
    chatWindowTableEl.caption.innerHTML = "Connected"
  });

  ws.on('message', function incoming(data) {
    var d = JSON.parse(data);
    var clean = sanitizeHtml(data);
    d.message = sanitizeHtml(d.message);
    addToOutput(clean);
    if(d.type == "broadcast") {
      var t = '<div class="uk-text-primary"><span class="uk-icon-server"/>  ' + d.message + '</div>';
      addToTable(chatWindowTableEl,t);
      chatScrollDown();
    }
    else {
      var t = "";
      var arrText = d.message.split(" ");
      if(arrText[0] == "/me") {
        var t = "<i>" + d.author;
        for(var i = 1; i < arrText.length; i++) {
          t += " " + arrText[i];
        }
        t += "</i>";
      }
      else {
        var t = "<b>" + d.author + ":</b> " + d.message;
      }
      addToTable(chatWindowTableEl,t);
      chatScrollDown();
    }
  });
}

function chatScrollDown() {
  chatWindowBoxEl.scrollTop = chatWindowBoxEl.scrollHeight;
}

function addToTable(table,data) {
    var row = table.insertRow(-1);
    var cel = row.insertCell(0);
    cel.innerHTML = data;
  //addToOutput("Table " + table.id + " : " + data);
}

//Output box functions and setup, etc
clearOutputEl.addEventListener('click', function () { clearOutput(); });
saveOutputEl.addEventListener('click', function() { saveOutput(); });
copyOutputEl.addEventListener('click', function() { copyOutput(); });
closeOutputEl.addEventListener('click', function () { toggleOutputBox(); });
toggleOutputEl.addEventListener('click', function () { toggleOutputBox(); });

function toggleOutputBox() {
  if(gridSmall) { growChatWindowBox(); }
  else { shrinkChatWindowBox(); }
}
function shrinkChatWindowBox() {
  chatWindowBoxEl.style.height = "calc(70% - 78px)";
   gridSmall=true;
}
function growChatWindowBox() {
  chatWindowBoxEl.style.height = "calc(100% - 78px)";
  gridSmall=false;
}

function saveOutput() {
  dialog.showSaveDialog(function(filename) { saveFile(outputBoxEl.innerHTML, filename); } );
}
function copyOutput() {
  clipboard.writeText(outputBoxEl.innerHTML);
}
function clearOutput() {
  outputBoxEl.innerHTML = "";
}
function addToOutput(content,startNewLine,endNewLine) {
  //I prefer to default to adding a newline *after* content is added, so the default is set up that way unless otherwise indicated
  if(startNewLine === undefined) { startNewLine = false; }
  if(endNewLine === undefined) { endNewLine = true; }
  if(startNewLine == true) { outputBoxEl.innerHTML += os.EOL; }
  outputBoxEl.innerHTML += content;
  if(endNewLine == true) { outputBoxEl.innerHTML += os.EOL; }
  outputBoxEl.scrollTop = outputBoxEl.scrollHeight;
}

function saveFile(data,filename) {
  if(data === undefined) { console.log("ERROR: No data to save to disk."); return; }
  if(filename === undefined) { console.log("ERROR: no filename provided"); return; }
  fs.writeFile(filename,data, function(err) {
    if(err) { console.log("An error occurred while writing the file: " + err); }
    console.log("Saved to disk as: " + filename);
 });
}

function toggleVisibility(element) {
  element.classList.toggle('uk-hidden');
}
function toggleActive(element) {
  element.classList.toggle('uk-active');
}