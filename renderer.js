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
var channelElements = {};
channelElements[serverIP] = {};
var displayedChat = serverIP;

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
var channelUserListEl = document.getElementById('channel-user-list');
var serverChatLinkEl = document.getElementById('server-chat-link');
channelElements[serverIP] = serverChatLinkEl;
var chatWindowFrameEl = document.getElementById('chat-window-frame');
var chatWindowBoxEl = document.getElementById('chat-window-box');
var chatWindowTableEl = document.getElementById('chat-window-table');
var chatTextInputEl = document.getElementById('chat-input-text');
var chatSendButtonEl = document.getElementById('chat-send-button');
var gridSmall = false;

//Settings button functions
settingsEl.addEventListener('click', function () {
  ipc.send('open-settings-window');
});

//Navs listeners
navServerEl.addEventListener('click',function () { console.log("server connection needed."); });
serverConnectButtonEl.addEventListener('click', function () {
  addToOutput("Connecting to " + serverIP + ":" + serverPort);
  connectToServer(serverIP + ":" + serverPort);
});
serverChatLinkEl.addEventListener('click', function (event) {
    rebuildChatWindow(serverIP);
    clearAllActive();
    serverChatLinkEl.classList.add("uk-active");
});

//send message listeners
chatTextInputEl.addEventListener('keyup', function (event) {
  if(event.keyCode == 13) {
    if(chatTextInputEl.value !== "") {
      sendMessage(chatTextInputEl.value, displayedChat);
      chatTextInputEl.value = "";
    }
  }
});
chatSendButtonEl.addEventListener('click', function () {
  if(chatTextInputEl.value !== "") {
    sendMessage(chatTextInputEl.value, displayedChat);
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
    var t = '<b>' + o.author + ':</b>  ' + o.message + '</div>';
    addToTable(chatWindowTableEl,t);
    chatScrollDown();
    if(!history.hasOwnProperty(destination)) { history[destination] = []; }
    history[destination].push(o);
  }
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
  var d = {};
  if(fromHistory) {
    d = data;
  }
  else {
    d = JSON.parse(data);
  }
  var clean = sanitizeHtml(data);
  if(d.hasOwnProperty("message")) { d.message = sanitizeHtml(d.message); }

  //types are "auth" "user_list" "direct_message" "message" "join" "quit" "broadcast"
  if(d.type == "join") {
    var t = '<div class="uk-text-primary"><span class="uk-icon-user-plus"></span>  ' + d.username + ' has joined.' + '</div>';
    if(displayedChat == serverIP) {
      addToTable(chatWindowTableEl,t);
      chatScrollDown();
    }
    else {
      addNotification(serverIP);
    }
    if(!fromHistory) {
      if(!users.hasOwnProperty(d.username)) {
        addToUsers(d.username);
      }
      users[d.username] = "online";
      history[serverIP].push(d);
      setNameOnline(d.username);
    }
  }
  else if(d.type == "quit") {
    var t = '<div class="uk-text-primary"><span class="uk-icon-user-times"></span>  ' + d.username + ' has left.' + '</div>';
    if(displayedChat == serverIP) {
      addToTable(chatWindowTableEl,t);
      chatScrollDown();
    }
    else {
      addNotification(serverIP);
    }
    if(!fromHistory) {
      users[d.username] = "offline";
      history[serverIP].push(d);
      setNameOffline(d.username);
    }
  }
  else if (d.type == "broadcast") {
    var t = '<div class="uk-text-primary"><span class="uk-icon-exchange"></span>  ' + d.message + '</div>';
    if(displayedChat == serverIP) {
      addToTable(chatWindowTableEl,t);
      chatScrollDown();
    }
    else {
      addNotification(serverIP);
    }
    if(!fromHistory) {
      history[serverIP].push(d);
    }
  }
  else if (d.type == "auth") {
    if(d.success = true) {
      navBarStatusEl.innerHTML = "Connected to..."
      var t = '<div class="uk-text-primary"><span class="uk-icon-exchange"></span>  Connected to server.</div>';
      if(displayedChat == serverIP) {
        addToTable(chatWindowTableEl,t);
        chatScrollDown();
      }
      else {
        addNotification(serverIP);
      }
      if(!fromHistory) {
        history[serverIP].push(d);
      }
    }
    else {
      var t = '<div class="uk-text-danger"><span class="uk-icon-exchange"></span>  Unable to connect.</div>';
      addToTable(chatWindowTableEl,t);
    }
  }
  else if (d.type == "direct_message") {
    var t = "<b>" + d.author + ":</b> " + d.message;
    if(displayedChat == d.author || d.author == handle) {
      addToTable(chatWindowTableEl,t);
      chatScrollDown();
    }
    else {
      addNotification(d.author);
    }
    if(!fromHistory) {
      if(!history.hasOwnProperty(d.author)) { history[d.author] = []; }
      history[d.author].push(d);
    }
  }
  else if (d.type == "user_list") {
    var t = "Users received: ";
    for(var i=0; i < d.users.length; i++) {
      t += d.users[i] + ", ";
      if(!users.hasOwnProperty(d.users[i])) {
        addToUsers(d.users[i]);
      }
      users[d.users[i]] = "online";
    }
  }
  else if (d.type == "typing") {
    //addToOutput(JSON.stringify(d));
  }
  else if(d.type == "message") {
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
    if(displayedChat == serverIP) {
      addToTable(chatWindowTableEl,t);
      chatScrollDown();
    }
    else {
      addNotification(serverIP);
    }
    if(!fromHistory) {
      history[serverIP].push(d);
    }
  }
  else {
    addToOutput("Unrecognized packet type!");
    addToOutput(JSON.stringify(data))
  }
}

function chatScrollDown() {
  chatWindowBoxEl.scrollTop = chatWindowBoxEl.scrollHeight;
}

function addToTable(table,data) {
    var row = table.insertRow(-1);
    var cel = row.insertCell(0);
    cel.innerHTML = data;
}

function addToUsers(user) {
  var li = document.createElement('LI');
  var a = document.createElement('A');
  a.href = "#";
  var t = document.createTextNode(user);
  a.appendChild(t);
  li.appendChild(a);
  channelUserListEl.appendChild(li);
  li.addEventListener('click', function (event) {
    rebuildChatWindow(t);
    clearAllActive();
    li.classList.add("uk-active");
  });
  channelElements[user] = li;
}

function addNotification(name) {
  //stupid hack to prevent multiple notifications haha
  clearNotification(name);
  channelElements[name].firstElementChild.innerHTML += ' <span class="uk-icon-comment-o uk-text-bold uk-text-primary"></span>';
  //sound effect?
}

function clearNotification(name) {
  if(name == serverIP) {
    channelElements[name].firstElementChild.innerHTML = 'Server Chat';
  }
  else {
    channelElements[name].firstElementChild.innerHTML = name;
  }
}

function setNameOffline(name) {
  channelElements[name].firstElementChild.classList.add("uk-text-muted");
  if(displayedChat == name) {
    chatTextInputEl.placeholder = "This user is offline.";
    chatTextInputEl.disabled = true;
    chatSendButtonEl.disabled = true;
  }
}

function setNameOnline(name) {
  channelElements[name].firstElementChild.classList.remove("uk-text-muted");
  if(displayedChat == name) {
    chatTextInputEl.placeholder = "";
    chatTextInputEl.disabled = false;
    chatSendButtonEl.disabled = false;
  }
}

function rebuildChatWindow(request) {
  if(request == serverIP) {
    displayedChat = serverIP;
    clearNotification(serverIP);
    chatTextInputEl.placeholder = '';
    chatTextInputEl.disabled = false;
    chatSendButtonEl.disabled = false;
  }
  else if (request.textContent == handle) {
    displayedChat = request.textContent;
    chatTextInputEl.placeholder = "You cannot send yourself direct messages.";
    chatTextInputEl.disabled = true;
    chatSendButtonEl.disabled = true;
  }
  else {
    displayedChat = request.textContent;
    clearNotification(request.textContent);
    if(users[displayedChat] == 'offline') {
      chatTextInputEl.placeholder = "This user is offline.";
      chatTextInputEl.disabled = true;
      chatSendButtonEl.disabled = true;
    }
    else {
      chatTextInputEl.placeholder = '';
      chatTextInputEl.disabled = false;
      chatSendButtonEl.disabled = false;
    }
  }
  chatWindowTableEl.innerHTML = "";
  if(history.hasOwnProperty(displayedChat)) {
    for(var i=0; i < history[displayedChat].length; i++) {
      parseMessage(history[displayedChat][i],true);
    }
  }
  else {
    addToTable(chatWindowTableEl,"<i>You have no chat history with " + displayedChat + " yet.</i>");
  }
}

function addToOutput(content,startNewLine,endNewLine) {
  console.log(content);
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
function clearAllActive() {
  serverChatLinkEl.classList.remove("uk-active");
  var i;
  for(i in channelElements) {
    channelElements[i].classList.remove("uk-active");
  }
}