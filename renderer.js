// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var config = require( __dirname + '/json/appconfig.json');
var ipc = require('electron').ipcRenderer;
var remote = require('electron').remote;
var WebSocket = require('ws');
var ws = {};
var os = require('os');
var fs = require('fs');
const {dialog} = require('electron').remote;
const {clipboard} = require('electron').remote;
var serverIP = config.serverIP;
var serverPort = config.serverPort;
var handle = config.username;
var pass = config.password;
const greeting = {type:"auth",password:pass,username:handle};
var history = {};
history[serverIP] = [];
var users = {};

var sanitizeHtml = require('sanitize-html');

//Selectors
var serverNameEl = document.getElementById('server-name-text');
var serverIPEl = document.getElementById('server-ip-text');
var serverPortEl = document.getElementById('server-port-text');
var serverSaveCheckEl = document.getElementById('server-save-checkbox');
var serverConnectButtonEl = document.getElementById('server-connect-button');
var settingsEl = document.getElementById('settings-button');
var navServerEl = document.getElementById('nav-server');
var navBarStatusEl = document.getElementById('nav-center');
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
/*
ipc.on('modal-hide', function() {
  console.log('hiding modal');
  modal.hide();
});
*/

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
      sendMessage(chatTextInputEl.value, serverIP);
      chatTextInputEl.value = "";
    }
  }
});
chatSendButtonEl.addEventListener('click', function () {
  if(chatTextInputEl.value !== "") {
    sendMessage(chatTextInputEl.value, serverIP);
    chatTextInputEl.value = "";
  }
});

function sendMessage(string, destination) {
  var o = {};
  //if there are ever multiple channels, this will break - need a different check from 'serverIP'
  if(destination == serverIP) {
    o = {
      message:string,
      author:handle,
      type:"message"
    };
    ws.send(JSON.stringify(o));
  }
  else {
    o = {
      message:string,
      recipient:destination,
      type:"direct_message"
    };
    ws.send(JSON.stringify(o));
    o.author = handle;
    var t = '<div class="uk-text-success"><span class="uk-icon-user-secret"></span>  <b>' + o.author + '</b>  ' + o.message + '</div>';
    addToTable(chatWindowTableEl,t);
    if(!history.hasOwnProperty(destination)) { history[destination] = []; }
    history[destination].push(o);
  }
  console.log(JSON.stringify(history));
}

function connectToServer(server) {
  ws = new WebSocket("ws://" + server);

  ws.on('open', function open() {
    ws.send(JSON.stringify(greeting));
    navBarStatusEl.innerHTML = "Connected to..."
  });

  ws.on('message', function incoming(data) {
    parseMessage(data, false);
  });
}

function parseMessage(data, fromHistory) {
  var d = JSON.parse(data);
  var clean = sanitizeHtml(data);
  if(d.hasOwnProperty("message")) { d.message = sanitizeHtml(d.message); }
  addToOutput("Recd: " + clean);

  //types are "auth" "user_list" "direct_message" "message" "join" "quit" "broadcast"
  if(d.type == "join") {
    var t = '<div class="uk-text-primary"><span class="uk-icon-user-plus"></span>  ' + d.username + ' has joined.' + '</div>';
    addToTable(chatWindowTableEl,t);
    chatScrollDown();
    users[d.username] = "online";
    addToOutput(JSON.stringify(users));
    if(!fromHistory) {
      history[serverIP].push(d);
    }
  }
  else if(d.type == "quit") {
    var t = '<div class="uk-text-primary"><span class="uk-icon-user-times"></span>  ' + d.username + ' has left.' + '</div>';
    addToTable(chatWindowTableEl,t);
    chatScrollDown();
    users[d.username] = "offline";
    addToOutput(JSON.stringify(users));
    if(!fromHistory) {
      history[serverIP].push(d);
    }
  }
  else if (d.type == "broadcast") {
    var t = '<div class="uk-text-primary"><span class="uk-icon-exchange"></span>  ' + d.message + '</div>';
    addToTable(chatWindowTableEl,t);
    if(!fromHistory) {
      history[serverIP].push(d);
    }
  }
  else if (d.type == "auth") {
    if(d.success = true) {
      navBarStatusEl.innerHTML = "Connected to..."
      var t = '<div class="uk-text-primary"><span class="uk-icon-exchange"></span>  Connected to server.</div>';
      addToTable(chatWindowTableEl,t);
      if(!fromHistory) {
        history[serverIP].push(d);
      }
    }
    else {
      var t = '<div class="uk-text-primary"><span class="uk-icon-exchange"></span>  Unable to connect.</div>';
      addToTable(chatWindowTableEl,t);
    }
  }
  else if (d.type == "direct_message") {
    var t = '<div class="uk-text-success"><span class="uk-icon-user-secret"></span>  <b>' + d.author + '</b>  ' + d.message + '</div>';
    addToTable(chatWindowTableEl,t);
    if(!fromHistory) {
      if(!history.hasOwnProperty(d.author)) { history[d.author] = []; }
      history[d.author].push(d);
    }
  }
  else if (d.type == "user_list") {
    var t = "Users received: ";
    for(var i=0; i < d.users.length; i++) {
      t += d.users[i] + ", ";
      users[d.users[i]] = "online";
    }
    addToOutput(JSON.stringify(users));
    addToOutput(t);
  }
  else if (d.type == "typing") {
    addToOutput(JSON.stringify(d));
  }
  else { //presumably a message or anything else lol
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
    if(!fromHistory) {
      history[serverIP].push(d);
    }
  }
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
  chatWindowBoxEl.style.height = "calc(100% - 108px)";
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