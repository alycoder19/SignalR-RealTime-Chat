document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    
    const HUB_URL = "/Chathub";

   
    const EVENT_RECEIVE_MESSAGE = "ReciveMessage";                 
    const EVENT_NEW_MEMBER = "NewMemberJoin";                      
    const EVENT_RECEIVE_GROUP_MESSAGE = "ReciveMessageFromGroup";  

  
    const METHOD_SEND = "Send";              
    const METHOD_JOIN_GROUP = "JoinGroup";     
    const METHOD_SEND_TO_GROUP = "SendToGroup";

    const TOAST_DURATION_MS = 4000;


    const userName = (prompt("Please Enter Your Name") || "").trim() || "Anonymous";

    
    const $ = (id) => document.getElementById(id);

    const statusBox = $("connectionStatus");
    const statusText = $("connectionStatusText");

    const allInput = $("allInput");
    const allSendButton = $("allSendButton");

    const groupNameInput = $("groupNameInput");
    const joinButton = $("joinButton");
    const joinedGroups = $("joinedGroups");
    const groupSelect = $("groupSelect");
    const groupMessageInput = $("groupMessageInput");
    const groupSendButton = $("groupSendButton");

    const list = $("notificationList");
    const emptyState = $("emptyState");
    const countBadge = $("notificationCount");
    const toastContainer = $("toastContainer");

    const joined = new Set();
    let total = 0;

    allInput.focus();

   
    const STATUS = {
        connected: { css: "rtn-status--connected", label: "Connected" },
        connecting: { css: "rtn-status--connecting", label: "Connecting" },
        disconnected: { css: "rtn-status--disconnected", label: "Disconnected" }
    };

    function setStatus(key) {
        statusBox.className = "rtn-status " + STATUS[key].css;
        statusText.textContent = STATUS[key].label;
        refreshControls();
    }

    function isConnected() {
        return connection.state === signalR.HubConnectionState.Connected;
    }

   
    const connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL)
        .withAutomaticReconnect()
        .build();

    

    
    connection.on(EVENT_RECEIVE_MESSAGE, function (sender, message) {
        showNotification(message, { sender: sender, group: null });
    });

    
    connection.on(EVENT_NEW_MEMBER, function (member, groupName) {
        showNotification(member + " has joined " + groupName, { sender: null, group: groupName });
    });

    
    connection.on(EVENT_RECEIVE_GROUP_MESSAGE, function (sender, message) {
        showNotification(message, { sender: sender, group: "Group" });
    });

    connection.onreconnecting(function () { setStatus("connecting"); });
    connection.onreconnected(function () { setStatus("connected"); });
    connection.onclose(function () { setStatus("disconnected"); });

    async function start() {
        setStatus("connecting");
        try {
            await connection.start();
            console.log("Connection started");
            setStatus("connected");
        } catch (err) {
            console.error("Connection error: ", err);
            setStatus("disconnected");
            setTimeout(start, 5000);
        }
    }

   
    async function sendToAll() {
        const message = allInput.value.trim();
        if (!message || !isConnected()) return;

        await run(allSendButton, async function () {
            await connection.invoke(METHOD_SEND, userName, message);
            allInput.value = "";
        });
        allInput.focus();
    }

    async function joinGroup() {
        const groupName = groupNameInput.value.trim();
        if (!groupName || !isConnected()) return;

        await run(joinButton, async function () {
            await connection.invoke(METHOD_JOIN_GROUP, groupName, userName);
            addJoinedGroup(groupName);
            groupNameInput.value = "";
        });
        groupNameInput.focus();
    }

    async function sendToGroup() {
        const groupName = groupSelect.value;
        const message = groupMessageInput.value.trim();
        if (!groupName || !message || !isConnected()) return;

        await run(groupSendButton, async function () {
            await connection.invoke(METHOD_SEND_TO_GROUP, groupName, userName, message);
            groupMessageInput.value = "";
        });
        groupMessageInput.focus();
    }

    
    async function run(button, action) {
        button.disabled = true;
        try {
            await action();
        } catch (err) {
            console.error("Send error: ", err);
        } finally {
            refreshControls();
        }
    }

   
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }

    
    function showNotification(message, options) {
        const time = new Date();
        addToList(message, time, options);
        showToast(message, options);
    }

    function addToList(message, time, options) {
        const item = document.createElement("li");
        item.className = "rtn-item rtn-item--new" + (options.group ? " rtn-item--group" : "");

        const dot = document.createElement("span");
        dot.className = "rtn-item__dot";
        dot.setAttribute("aria-hidden", "true");

        const body = document.createElement("div");
        body.className = "rtn-item__body";

        
        const text = document.createElement("p");
        text.className = "rtn-item__message";
        if (options.sender) {
            const senderEl = document.createElement("strong");
            senderEl.textContent = options.sender + ": ";
            text.append(senderEl);
        }
        text.append(document.createTextNode(message));

        const meta = document.createElement("div");
        meta.className = "rtn-item__meta";

        const tag = document.createElement("span");
        tag.className = "rtn-item__tag";
        tag.textContent = options.group || "Everyone";

        const timeEl = document.createElement("time");
        timeEl.dateTime = time.toISOString();
        timeEl.textContent = formatTime(time);

        meta.append(tag, timeEl);
        body.append(text, meta);
        item.append(dot, body);

        list.prepend(item); 
        item.addEventListener("animationend", function (e) {
            if (e.animationName === "rtn-enter") item.classList.remove("rtn-item--new");
        });

        total++;
        countBadge.textContent = total;
        emptyState.hidden = true;
    }

    function showToast(message, options) {
        const toast = document.createElement("div");
        toast.className = "rtn-toast" + (options.group ? " rtn-toast--group" : "");
        toast.setAttribute("role", "status");

        const source = document.createElement("span");
        source.className = "rtn-toast__source";
        const where = options.group ? "Group: " + options.group : "Everyone";
        source.textContent = options.sender ? options.sender + " · " + where : where;

        const text = document.createElement("p");
        text.className = "rtn-toast__message";
        text.textContent = message;

        toast.append(source, text);
        toastContainer.append(toast);

        setTimeout(function () {
            toast.classList.add("rtn-toast--leaving");
            setTimeout(function () { toast.remove(); }, 300);
        }, TOAST_DURATION_MS);
    }

    function addJoinedGroup(groupName) {
        if (joined.has(groupName)) return;
        joined.add(groupName);

        const chip = document.createElement("li");
        chip.className = "rtn-chip";
        chip.textContent = groupName;
        joinedGroups.append(chip);

        if (joined.size === 1) groupSelect.innerHTML = ""; 
        const option = document.createElement("option");
        option.value = groupName;
        option.textContent = "Send to: " + groupName;
        groupSelect.append(option);
        groupSelect.value = groupName;
    }

    function refreshControls() {
        const connected = isConnected();
        const hasGroups = joined.size > 0;

        allSendButton.disabled = !connected || !allInput.value.trim();
        joinButton.disabled = !connected || !groupNameInput.value.trim();

        groupSelect.disabled = !hasGroups;
        groupMessageInput.disabled = !hasGroups;
        groupSendButton.disabled = !connected || !hasGroups || !groupMessageInput.value.trim();
    }

   
    [allInput, groupNameInput, groupMessageInput].forEach(function (el) {
        el.addEventListener("input", refreshControls);
    });

    function onEnter(el, handler) {
        el.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                handler();
            }
        });
    }

    onEnter(allInput, sendToAll);
    onEnter(groupNameInput, joinGroup);
    onEnter(groupMessageInput, sendToGroup);

    allSendButton.addEventListener("click", sendToAll);
    joinButton.addEventListener("click", joinGroup);
    groupSendButton.addEventListener("click", sendToGroup);

   
    start();
});